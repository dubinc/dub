"use client";

import { Button } from "@dub/ui";

export function DeleteProgram({ programId }: { programId: string }) {
  // TODO:
  // Delete program

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col gap-1 p-8">
        <h2 className="text-xl font-medium text-neutral-900">Delete program</h2>
        <p className="text-sm font-normal text-neutral-600">
          Permanently delete your partner program, and all of your data. This
          action cannot be undone - please proceed with caution.
        </p>
      </div>
      <div className="border-t border-neutral-200" />
      <div className="flex items-center justify-end rounded-b-lg bg-neutral-50 px-8 py-5">
        <div>
          <Button
            text="Delete program"
            variant="danger"
            className="h-8"
            disabledTooltip={
              <div className="px-3 py-2 text-sm text-neutral-600">
                <a
                  className="underline"
                  href="mailto:support@dub.co?subject=Delete my program"
                >
                  Contact us
                </a>{" "}
                to delete your program.
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
