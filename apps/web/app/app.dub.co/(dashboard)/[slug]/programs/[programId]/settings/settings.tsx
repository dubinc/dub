"use client";

import { Button } from "@dub/ui";

const commissionTypes = [
  {
    label: "One-off",
    description: "Pay a one-time payout",
    value: "one-off",
  },
  {
    label: "Recurring",
    description: "Pay an ongoing payout",
    value: "recurring",
  },
];

export function ProgramSettings({ programId }: { programId: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center border-b border-neutral-200 p-6">
        <h2 className="text-xl font-medium text-neutral-900">Program</h2>
      </div>

      <div className="space-y-8 divide-y divide-neutral-200 p-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <h3 className="basis-1/2 font-medium text-gray-900">Summary</h3>
          <p className="basis-1/2 rounded-md border border-neutral-200 bg-[#f9f9f9] p-4 text-sm font-normal leading-relaxed text-neutral-600">
            Earn $10.00 for each conversion, and again for every conversion of
            the customers lifetime.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-8 sm:flex-row">
          <div className="flex basis-1/2 flex-col gap-1">
            <h3 className="font-medium text-gray-900">Commission</h3>
            <p className="text-sm text-gray-600">
              Set how the affiliate will get rewarded
            </p>
          </div>
          <p className="basis-1/2 space-y-6">
            <div className="flex w-full gap-3">
              {commissionTypes.map((commissionType) => (
                <label
                  key={commissionType.value}
                  className="relative inline-flex w-full cursor-pointer flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    value={commissionType.value}
                    name="commissionType"
                    className="absolute right-2 top-2 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-neutral-600">
                    {commissionType.label}
                  </span>
                  <span className="text-xs font-normal text-neutral-600">
                    {commissionType.description}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label htmlFor="duration" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-600">Duration</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <select
                  className="block w-full rounded-md border-gray-300 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  required
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-8 sm:flex-row">
          <div className="flex basis-1/2 flex-col gap-1">
            <h3 className="font-medium text-gray-900">Payout</h3>
            <p className="text-sm text-gray-500">
              Set how much the affiliate will get rewarded
            </p>
          </div>
          <p className="basis-1/2 space-y-6">
            <div>
              <label
                htmlFor="payoutModel"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-gray-600">
                  Payout model
                </h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <select
                  className="block w-full rounded-md border-gray-300 text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  required
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="payoutAmount"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-gray-600">Amount</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="minimumAmount"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-gray-600">
                  Minimum payout
                </h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Minimum payout is $100
              </p>
            </div>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-neutral-200 bg-gray-50 px-8 py-5">
        <div>
          <Button text="Save changes" className="h-8" />
        </div>
      </div>
    </div>
  );
}
