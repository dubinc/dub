import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import { Dispatch, SetStateAction } from "react";
import va from "@vercel/analytics";

export default function ProBanner({
  setShowProBanner,
}: {
  setShowProBanner: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query;
  return (
    <div className="fixed bottom-5 z-10 mx-5 flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-lg sm:right-5 sm:mx-auto sm:max-w-sm">
      <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
      <p className="text-sm text-gray-500">
        It looks like you're currently on our free plan. Consider upgrading to
        Pro to enjoy higher limits, extra features, and support our open-source
        company.
      </p>
      <div className="flex space-x-5">
        <button
          onClick={() => {
            setShowProBanner(false);
            va.track("Hid Pro Banner");
            Cookies.set("hideProBanner", true, { expires: 7 });
          }}
          className="w-full rounded-md border border-gray-300 p-2 text-center text-sm font-medium text-gray-500 transition-all hover:border-gray-700 hover:text-gray-600"
        >
          Don't show again
        </button>
        <Link
          href={`/${slug}/settings/billing`}
          onClick={() => {
            va.track("Clicked on Pro Banner");
          }}
          className="w-full rounded-md border border-black bg-black p-2 text-center text-sm font-medium text-white transition-all hover:bg-white hover:text-black"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
