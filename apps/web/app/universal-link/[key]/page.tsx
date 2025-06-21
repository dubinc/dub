import { headers } from "next/headers";
import Script from "next/script";

export default function UniversalLinkPage({
  params,
}: {
  params: { key: string };
}) {
  const fallbackUrl = headers().get("fallback-url");

  return (
    <>
      <Script
        id="universal-link-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.onload = function() {
              setTimeout(function() {
                window.location = "${fallbackUrl}";
              }, 1000);
            };
          `,
        }}
      />
      <iframe id="l" width="1" height="1" style={{ visibility: "hidden" }} />
    </>
  );
}
