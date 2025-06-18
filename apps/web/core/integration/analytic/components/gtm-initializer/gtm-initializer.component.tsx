import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { FC } from "react";

export const GtmInitializerComponent: FC = () => {
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
    </>
  );
};
