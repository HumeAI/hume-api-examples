import "./globals.css";
import { Nav } from "./components/Nav";
import { File } from "./components/File";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="App flex flex-col min-h-screen absolute inset-0 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <Nav />
        <File />
        {children}
      </body>
    </html>
  );
}
