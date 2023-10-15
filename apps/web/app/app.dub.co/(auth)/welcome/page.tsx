import { constructMetadata } from "@dub/utils";
import WelcomePageClient from "./page-client";
import { Suspense } from "react";

export const metadata = constructMetadata({
  title: "Welcome to Dub",
});

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomePageClient />
    </Suspense>
  );
}
