"use client";

import {
  FingerprintJSPro,
  FpjsProvider,
} from "@fingerprintjs/fingerprintjs-pro-react";
import { ReactNode } from "react";

export function FingerprintProvider({ children }: { children: ReactNode }) {
  return (
    <FpjsProvider
      loadOptions={{
        apiKey: `${process.env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_KEY}`,
        endpoint: [FingerprintJSPro.defaultEndpoint],
        scriptUrlPattern: [FingerprintJSPro.defaultScriptUrlPattern],
      }}
    >
      {children}
    </FpjsProvider>
  );
}
