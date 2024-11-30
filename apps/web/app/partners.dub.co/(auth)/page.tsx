import { constructMetadata } from "@dub/utils";
import { PartnersPageClient } from "./page-client";

export const metadata = constructMetadata({
  noIndex: true,
});

export default function PartnersPage() {
  return <PartnersPageClient />;
}
