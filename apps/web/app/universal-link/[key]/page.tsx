import Script from "next/script";

export default function UniversalLinkPage({
  params,
}: {
  params: { key: string };
}) {
  // TODO:
  // read the fallback url from header
  const fallbackUrl = "https://example.com/fallback";

  console.log("fallbackUrl", fallbackUrl);

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