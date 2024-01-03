import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFroms3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbedding } from "./embeddings";
import md5 from "md5";
import { convertToASCII } from "./utils";

let pinecone: Pinecone | null = null;
export const getPineconeClient = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  // obtain pdf
  const file_name = await downloadFroms3(fileKey);
  if (!file_name) {
    throw new Error("could not download from s3");
  }
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // split and segement the pdf
  const docs = await Promise.all(pages.map(prepareDoc));

  // vector embed individual doc
  const vectors = await Promise.all(docs.flat().map(embedDocument));

  // upload to pinecone database
  const pinecone_client = await getPineconeClient();
  const pinecone_index = pinecone_client.Index("chatterer");

  console.log("inserting vector into pinecone");
  const namespace = pinecone_index.namespace(convertToASCII(fileKey));

  await namespace.upsert(vectors);

  return docs[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbedding(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

//async function

export const truncateStringBytes = (str: string, bytes: number) => {
  const encoder = new TextEncoder();
  return new TextDecoder("utf-8").decode(encoder.encode(str).slice(0, bytes));
};

async function prepareDoc(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  //split docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringBytes(pageContent, 36000),
      },
    }),
  ]);

  return docs;
}
