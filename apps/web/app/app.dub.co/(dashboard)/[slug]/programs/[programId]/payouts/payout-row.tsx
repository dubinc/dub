"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutProps } from "@/lib/types";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import { Button, CardList, Popover } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { useContext, useState } from "react";
import { PayoutsListContext } from "./context";

export function PayoutRow({
  payout,
  payoutsCount,
}: {
  payout: PayoutProps;
  payoutsCount?: { payoutId: string; _count: number }[];
}) {
  const { id, slug } = useWorkspace();
  const [processing, setProcessing] = useState(false);
  const { openMenu, setOpenMenu } = useContext(PayoutsListContext);

  const setOpenPopover = (open: boolean) => {
    setOpenMenu(open ? payout.id : null);
  };

  return (
    <>
      <CardList.Card
        key={payout.id}
        innerClassName={cn(
          "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
          processing && "opacity-50",
        )}
      >
        <div className="flex min-w-0 grow items-center gap-3">
          {new Date(payout.periodStart).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          {" - "}
          {new Date(payout.periodEnd).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>

        <div className="flex min-w-0 grow items-center gap-3">
          {payout.status}
        </div>

        <div className="flex min-w-0 grow items-center gap-3">
          {payout.total}
        </div>

        <div className="flex min-w-0 grow items-center gap-3">
          {payout.partner.name}
        </div>

        <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
          {/* {tagsCount !== undefined && (
            <Link
              href={`/${slug}?tagIds=${tag.id}`}
              className="whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
            >
              {nFormatter(linksCount || 0)} {pluralize("link", linksCount || 0)}
            </Link>
          )} */}
          <Popover
            content={
              <div className="grid w-full gap-px p-2 sm:w-48">
                <Button
                  text="Delete"
                  variant="danger-outline"
                  // onClick={handleDelete}
                  icon={<Delete className="h-4 w-4" />}
                  shortcut="X"
                  className="h-9 px-2 font-medium"
                />
              </div>
            }
            align="end"
            openPopover={openMenu}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "h-8 px-1.5 outline-none transition-all duration-200",
                "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
              )}
              icon={
                processing ? (
                  <LoadingSpinner className="h-5 w-5 shrink-0" />
                ) : (
                  <ThreeDots className="h-5 w-5 shrink-0" />
                )
              }
              onClick={() => {
                // setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        </div>
      </CardList.Card>
    </>
  );
}
