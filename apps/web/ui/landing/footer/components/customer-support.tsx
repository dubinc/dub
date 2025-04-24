import HelpPhone from "@/ui/shared/icons/customer-support.tsx";
import Link from "next/link";

export const CustomerSupport = () => (
  <div className="text-neutral mr-20 max-md:mt-6">
    <p className="mb-4 text-lg font-semibold">Customer Support</p>
    <Link
      className="text-neutral text-base font-medium"
      href={`/cancel-my-subscription`}
      target="_blank"
    >
      How to Cancel
    </Link>
    <Link
      className="my-3 flex h-[44px] w-full items-center justify-center gap-3 rounded-full border border-black px-4 py-2 text-sm font-medium"
      href="https://hint.app/help"
      target="_blank"
    >
      <HelpPhone className="h-6 w-6" />
      Customer Support <br />
      24/7/365
    </Link>
  </div>
);
