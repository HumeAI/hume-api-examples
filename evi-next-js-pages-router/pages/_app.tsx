import { Nav } from "@/components/Nav";
import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/utils";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        "flex flex-col min-h-screen",
      )}
    >
      <Nav />
      <Component {...pageProps} />
    </div>
  );
}
