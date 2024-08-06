import { useRouterStuff } from "@dub/ui";
import Cookies from "js-cookie";
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
    <div className="fixed bottom-5 z-10 mx-5 flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-lg sm:right-5 sm:mx-auto sm:max-w-sm">
      <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
      <p className="text-sm text-gray-500">
        It looks like you're currently on our Free plan. Please consider
        upgrading to Pro to enjoy higher limits and extra features.
      </p>
      <div className="flex space-x-5">
        <button
          onClick={() => {
            setShowProBanner(false);
            posthog.capture("pro_banner_hidden", {
              workspace: slug,
            });
            Cookies.set("hideProBanner", slug, { expires: 7 });
          }}
          className="w-full rounded-md border border-gray-300 p-2 text-center text-sm font-medium text-gray-500 transition-all hover:border-gray-700 hover:text-gray-600"
        >
          Don't show again
        </button>
        <button
          onClick={() => {
            posthog.capture("pro_banner_clicked", {
              workspace: slug,
            });
            queryParams({
              set: {
                upgrade: "pro",
              },
            });
          }}
          className="w-full rounded-md border border-black bg-black p-2 text-center text-sm font-medium text-white transition-all hover:bg-white hover:text-black"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
