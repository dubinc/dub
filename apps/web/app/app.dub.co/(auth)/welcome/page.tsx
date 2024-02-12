import { constructMetadata } from "@dub/utils";
import { Background } from "@dub/ui";
import { Suspense } from "react";
import WelcomePageClient from "./page-client";

export const runtime = "nodejs";

export const metadata = constructMetadata({
  title: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function WelcomePage() {
  return (
    <div className="flex h-screen flex-col items-center">
      <Background />
      <Suspense fallback={null}>
        <WelcomePageClient />
      </Suspense>
    </div>
  );
}
