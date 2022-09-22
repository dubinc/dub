import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

const CRISP_SCRIPT = `window.$crisp=[];window.CRISP_WEBSITE_ID="2c09b1ee-14c2-46d1-bf72-1dbb998a19e0";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`;

export default function Document() {
  return (
    <Html className="min-h-screen bg-white">
      <Head />
      <body>
        <Script
          id="script-crisp"
          dangerouslySetInnerHTML={{
            __html: CRISP_SCRIPT,
          }}
          strategy="afterInteractive"
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
