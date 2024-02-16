import { LoadingSpinner } from "@dub/ui";
import { APP_NAME } from "@dub/utils";
import { Suspense } from "react";
import SAMLIDPForm from "./form";

export default function SAMLPage() {
  return (
    <div>
      <Suspense>
        <SAMLIDPForm />
      </Suspense>
      <div className="flex h-screen flex-col items-center justify-center space-y-6 text-center">
        <h1 className="font-display text-4xl font-bold">Authenticating</h1>
        <p className="text-lg text-gray-600">
          {APP_NAME} is verifying your identity.
          <br /> Please wait...
        </p>
        <LoadingSpinner className="h-7 w-7" />
      </div>
    </div>
  );
}
