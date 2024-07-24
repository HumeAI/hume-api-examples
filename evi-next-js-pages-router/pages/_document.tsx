import { Html, Head, Main, NextScript } from "next/document";
import { cn } from "@/utils";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className={cn("flex flex-col min-h-screen")}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
