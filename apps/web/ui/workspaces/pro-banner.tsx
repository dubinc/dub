import { Button, buttonVariants, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import { Dispatch, SetStateAction } from "react";

export default function ProBanner({
  setShowProBanner,
}: {
  setShowProBanner: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useParams() as { slug: string };
  const { queryParams } = useRouterStuff();

  return (
    <div className="fixed bottom-24 z-10 mx-5 flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-lg sm:right-5 sm:mx-auto sm:max-w-sm">
      <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
      <p className="text-sm text-gray-500">
        It looks like you're currently on our Free plan. Please consider
        upgrading to Pro to enjoy higher limits and extra features.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="secondary"
          text="Don't show again"
          onClick={() => {
            setShowProBanner(false);
            posthog.capture("pro_banner_hidden", {
              workspace: slug,
            });
            Cookies.set("hideProBanner", slug, { expires: 180 });
          }}
        />
        <Link
          href={`/${slug}/upgrade`}
          className={cn(
            buttonVariants(),
            "flex w-full items-center justify-center whitespace-nowrap rounded-md border text-sm",
          )}
        >
          Benefits of Pro
        </Link>
      </div>
    </div>
  );
}
