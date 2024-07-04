import { getSession } from "@/lib/auth";
import { vaidateAuthorizeRequest } from "@/lib/oauth";
import z from "@/lib/zod";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { Logo } from "@dub/ui";
import { HOME_DOMAIN, constructMetadata } from "@dub/utils";
import { ArrowLeftRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthorizeForm } from "./authorize-form";
import { ScopesRequested } from "./scopes-requested";

export const runtime = "nodejs";

export const metadata = constructMetadata({
  title: "Authorize API access | Dub",
  noIndex: true,
});

export default async function Authorize({
  searchParams,
}: {
  searchParams?: z.infer<typeof authorizeRequestSchema>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { oAuthClient, request } = await vaidateAuthorizeRequest(searchParams);

  return (
    <div className="relative z-10 mt-[calc(30vh)] h-fit w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
      <div className="flex flex-col items-center justify-center space-y-6 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
        <div className="flex items-center gap-3">
          <a href={oAuthClient.website} target="_blank" rel="noreferrer">
            <Logo className="h-14 w-14" />
          </a>
          <ArrowLeftRight className="h-6 w-6 text-gray-500" />
          <a href={HOME_DOMAIN} target="_blank" rel="noreferrer">
            <Logo className="h-14 w-14" />
          </a>
        </div>
        <p className="text-md">
          <a
            className="font-bold text-blue-500"
            href={oAuthClient.website}
            target="_blank"
            rel="noreferrer"
          >
            {oAuthClient.name}
          </a>{" "}
          is requesting API access to a workspace.
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-white px-2 py-6 sm:px-10">
        <ScopesRequested scopes={oAuthClient.scopes} />
      </div>
      <div className="flex flex-col space-y-2 border-t border-gray-200 bg-white px-2 py-6 sm:px-10">
        <Suspense fallback={<></>}>
          <AuthorizeForm oAuthClient={oAuthClient} {...request} />
        </Suspense>
      </div>
    </div>
  );
}
