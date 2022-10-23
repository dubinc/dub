import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html
      className="min-h-screen bg-white dark:bg-slate-900/95 dark:text-slate-400 dark"
      lang="en"
    >
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
