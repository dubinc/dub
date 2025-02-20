import { StepPage } from "../step-page";
import { GettingStarted } from "./page-client";

export default async function Page() {
  return (
    <StepPage title="Getting started">
      <GettingStarted />
    </StepPage>
  );
}
