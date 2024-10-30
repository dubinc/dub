import { Button } from "@dub/ui";

export function ProgramOverview() {
  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-[#f9f9f9]">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">
            Sign up page
          </span>
          <span className="text-sm font-medium leading-none text-neutral-900">
            partner.dub.co/calcom
          </span>
        </div>

        <div className="flex items-center justify-between gap-5 divide-x divide-neutral-200">
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Commission
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              20%
            </span>
          </div>

          <div className="flex flex-col gap-1 pl-5 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Cookie length
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              7 days
            </span>
          </div>

          <div className="flex flex-col gap-1 pl-5 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Min payout
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              $100
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center px-4 py-4">
        <p className="flex-1 text-sm font-medium leading-none text-neutral-900">
          Earn $10.00 for each conversion, and again for every conversion of the
          customers lifetime.
        </p>
        <Button className="h-8 w-fit" text="Edit program" />
      </div>
    </div>
  );
}
