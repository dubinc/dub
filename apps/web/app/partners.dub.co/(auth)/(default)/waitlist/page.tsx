import { constructMetadata } from "@dub/utils";
import { PartnersWaitlistPageClient } from "./page-client";

export const metadata = constructMetadata({
  noIndex: true,
});

export default function PartnersWaitlistPage() {
  return <PartnersWaitlistPageClient />;
}
