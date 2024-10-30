import { Button } from "@dub/ui";

export function PendingPayouts() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">
          Pending payouts
        </h2>
        <Button className="h-7 w-fit" text="View all" />
      </div>

      <div className="min-h-[200px] rounded-md border"></div>
    </>
  );
}
