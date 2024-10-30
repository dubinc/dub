export function PayoutStats({ programId }: { programId: string }) {
  return (
    <div className="flex w-full gap-4">
      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">All</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          830
        </div>
      </div>

      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">Pending</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          415
        </div>
      </div>

      <div className="flex basis-1/3 flex-col items-start justify-start gap-1 rounded-lg border border-neutral-300 px-4 py-3">
        <div className="text-[13px] font-normal text-neutral-500">Paid</div>
        <div className="text-lg font-semibold leading-tight text-neutral-800">
          415
        </div>
      </div>
    </div>
  );
}
