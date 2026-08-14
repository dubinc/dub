import { validateAuthorizeRequest } from "@/lib/api/oauth/actions";
import { requireServerSessionRedirect } from "@/lib/better-auth/get-session";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import EmptyState from "@/ui/shared/empty-state";
import { BlurImage, Logo } from "@dub/ui";
import { CircleWarning, CubeSettings } from "@dub/ui/icons";
import { constructMetadata } from "@dub/utils";
import { ArrowLeftRight } from "lucide-react";
import { Suspense } from "react";
import * as z from "zod/v4";
import { AuthorizeForm } from "./authorize-form";
import { ScopesRequested } from "./scopes-requested";

export const metadata = constructMetadata({
  title: "Authorize API access | Dub",
  noIndex: true,
});

// OAuth app consent page
export default async function Authorize(props: {
  searchParams?: Promise<z.infer<typeof authorizeRequestSchema>>;
}) {
  const searchParams = await props.searchParams;
  await requireServerSessionRedirect();

  const { error, integration, requestParams } =
    await validateAuthorizeRequest(searchParams);

  if (error || !integration) {
    return (
      <EmptyState
        icon={CubeSettings}
        title="Invalid OAuth Request"
        description={error}
      />
    );
  }

  return (
    <div className="relative z-10 mx-4 my-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl sm:mx-auto">
      <div className="flex flex-col items-center justify-center gap-3 border-b border-neutral-200 px-4 py-6 pt-8 text-center sm:rounded-t-2xl sm:px-16">
        <div className="flex items-center gap-3">
          <a href={integration.website} target="_blank" rel="noreferrer">
            {integration.logo ? (
              <BlurImage
                src={integration.logo}
                alt={`Logo for ${integration.name}`}
                className="size-12 rounded-full border border-neutral-200"
                width={20}
                height={20}
              />
            ) : (
              <Logo className="size-12" />
            )}
          </a>
          <ArrowLeftRight className="size-5 text-neutral-500" />
          <a href="https://dub.co" target="_blank" rel="noreferrer">
            <Logo className="size-12" />
          </a>
        </div>

        <p className="text-md">
          <span className="font-bold">{integration.name}</span> is requesting
          API access to a workspace on Dub.
        </p>
        <span className="text-xs text-neutral-500">
          Built by{" "}
          <a
            href={integration.website}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {integration.developer}
          </a>
        </span>

        {!integration.verified && (
          <div className="flex w-full items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left sm:-mx-6 sm:w-auto sm:self-stretch">
            <CircleWarning className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="flex flex-col gap-0.5 text-sm text-amber-900">
              <p className="font-medium">
                Dub hasn't verified this integration
              </p>
              <p className="text-amber-800">
                It can only be installed by its developer or on the developer's
                workspace.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-3 px-4 py-6 sm:px-10">
        <ScopesRequested scopes={requestParams.scope} />
      </div>
      <div className="flex flex-col space-y-2 border-t border-neutral-200 px-4 py-6 sm:rounded-b-2xl sm:px-10">
        <Suspense>
          <AuthorizeForm {...requestParams} integration={integration} />
        </Suspense>
      </div>
    </div>
  );
}
