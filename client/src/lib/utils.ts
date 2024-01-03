import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToASCII(inputString: string): string {
  //remove non ascii characters
  const asciistring = inputString.replace(/[^\x00-\x7F]/g, "");
  return asciistring;
}
