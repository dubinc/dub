"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutWithPartnerProps } from "@/lib/types";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import { Badge, Button, CardList, Popover } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { useContext, useState } from "react";
import { PayoutsListContext } from "./context";

export function PayoutRow({
  payout,
  payoutsCount,
}: {
  payout: PayoutWithPartnerProps;
  payoutsCount?: { payoutId: string; _count: number }[];
}) {
  const { id, slug } = useWorkspace();
  const [processing, setProcessing] = useState(false);
  const { openMenuId, setOpenMenuId } = useContext(PayoutsListContext);

  const setOpenPopover = (open: boolean) => {
    setOpenMenuId(open ? payout.id : null);
  };

  const openPopover = openMenuId === payout.id;

  return (
    <>
      <CardList.Card
        key={payout.id}
        innerClassName={cn(
          "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity text-neutral-500 text-sm font-normal leading-none",
          processing && "opacity-50",
        )}
      >
        <div>
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

        <div>
          <Badge>{payout.status}</Badge>
        </div>

        <div>${payout.total / 100}</div>

        <div>{payout.partner.name}</div>

        <div>{payout._count.sales}</div>

        <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
          <Popover
            content={
              <div className="grid w-full gap-px p-2 sm:w-36">
                <Button
                  text="Pay invoice"
                  variant="outline"
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />

                <Button
                  text="Review"
                  variant="outline"
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />

                <Button
                  text="View partner"
                  variant="outline"
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
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
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        </div>
      </CardList.Card>
    </>
  );
}
