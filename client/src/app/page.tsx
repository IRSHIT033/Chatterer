import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { UserButton, auth } from "@clerk/nextjs";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  return (
    <div className="w-screen min-h-screen bg-gradient-to-r from-rose-100 to-teal-100">
      <UserButton afterSignOutUrl="/" />
      {isAuth && <h1>chat with pdf</h1>}
      {isAuth ? (
        <FileUpload />
      ) : (
        <Link href="/sign-in">
          <Button>login to get started</Button>
        </Link>
      )}
    </div>
  );
}
