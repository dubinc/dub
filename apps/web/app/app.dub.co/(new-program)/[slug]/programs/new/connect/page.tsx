import { StepPage } from "../step-page";
import { PageClient } from "./page-client";

export default async function Page() {
  return (
    <StepPage title="Connecting Dub">
      <PageClient />
    </StepPage>
  );
}
