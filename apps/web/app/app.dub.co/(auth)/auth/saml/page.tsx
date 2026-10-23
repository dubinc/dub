import EmptyState from "@/ui/shared/empty-state";
import { LoadingSpinner } from "@dub/ui";
import { Suspense } from "react";
import SAMLIDPForm from "./form";

export default function SAMLPage() {
  return (
    <>
      <EmptyState
        icon={LoadingSpinner}
        title="SAML Authentication"
        description="Dub is verifying your identity via SAML. This might take a few seconds..."
      />
      <Suspense>
        <SAMLIDPForm />
      </Suspense>
    </>
  );
}
