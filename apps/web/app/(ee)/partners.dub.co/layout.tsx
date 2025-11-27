"use client";

import {
  FingerprintJSPro,
  FpjsProvider,
} from "@fingerprintjs/fingerprintjs-pro-react";
import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return (
    <FpjsProvider
      loadOptions={{
        apiKey: `${process.env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY}`,
        endpoint: [FingerprintJSPro.defaultEndpoint],
        scriptUrlPattern: [FingerprintJSPro.defaultScriptUrlPattern],
      }}
    >
      <SessionProvider>
        <Suspense>{children}</Suspense>
      </SessionProvider>
    </FpjsProvider>
  );
}
