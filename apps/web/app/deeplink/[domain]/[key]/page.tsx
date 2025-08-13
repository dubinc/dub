import { getLinkViaEdge } from "@/lib/planetscale";
import { BlurImage } from "@dub/ui";
import { DUB_LOGO } from "@dub/utils";
import { notFound } from "next/navigation";
import { DeepLinkActionButtons } from "./action-buttons";

export const runtime = "edge";

export default async function DeepLinkPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  // Get link data for displaying app info
  const link = await getLinkViaEdge({ domain, key });
  console.log({ link });

  if (!link) {
    notFound();
  }

  return (
    <main className="flex h-dvh w-full flex-col justify-between bg-gray-50 px-4 py-8">
      {/* Top section with logo and title */}
      <div className="flex flex-col items-center gap-y-6">
        <div className="rounded-lg border border-neutral-200 p-2 shadow-md">
          <BlurImage
            src={DUB_LOGO}
            alt="Dub Logo"
            width={48}
            height={48}
            className="size-12"
          />
        </div>

        <h2 className="font-display text-xl font-bold text-gray-900">
          Open this page in the app
        </h2>
      </div>

      <DeepLinkActionButtons link={link} />
    </main>
  );
}
