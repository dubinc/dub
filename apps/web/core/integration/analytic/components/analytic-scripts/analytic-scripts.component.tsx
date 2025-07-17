import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { FC } from "react";

export const AnalyticScriptsComponent: FC = () => {
  return (
    <>
      <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTAG_CONTAINER_ID!} />
      <Script id="google-analytics">
        {`
         function gtag() {
          if (dataLayer) {
            dataLayer.push(arguments)
          }
         }
         gtag('js', new Date());
         gtag('config', "${process.env.NEXT_PUBLIC_GTAG_CONTAINER_ID}");
       `}
      </Script>
      <Script
        id="ahrefs-analytics"
        src="https://analytics.ahrefs.com/analytics.js"
        data-key={process.env.NEXT_PUBLIC_AHREFS_DATA_KEY}
      />
    </>
  );
};
