import EmptyState from "@/ui/shared/empty-state";
import { LoadingSpinner } from "@dub/ui";
import { APP_NAME } from "@dub/utils";
import { Suspense } from "react";
import SAMLIDPForm from "./form";

export default function SAMLPage() {
  return (
    <>
      <EmptyState
        icon={LoadingSpinner}
        title="SAML Authentication"
        description={`${APP_NAME} is verifying your identity via SAML. This might take a few seconds...`}
      />
      <Suspense>
        <SAMLIDPForm />
      </Suspense>
    </>
  );
}
