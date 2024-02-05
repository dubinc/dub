import { constructMetadata } from "@dub/utils";
import WelcomePageClient from "./page-client";
import { Background } from "@dub/ui";
import { Suspense } from "react";

export const runtime = "nodejs";

export const metadata = constructMetadata({
  title: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function WelcomePage() {
  return (
    <>
      <Background />
      <Suspense>
        <WelcomePageClient />
      </Suspense>
    </>
  );
}
