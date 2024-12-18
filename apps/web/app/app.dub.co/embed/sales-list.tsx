import { PartnerSaleResponse } from "@/lib/types";
import { Gift, LoadingSpinner } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";

export function SalesList({
  sales,
  isLoading,
  hasPartnerProfile,
}: {
  sales: PartnerSaleResponse[] | undefined;
  isLoading: boolean;
  hasPartnerProfile: boolean;
}) {
  return sales ? (
    sales.length ? (
      <div className="mt-2.5 rounded-md border border-neutral-200">
        <div
          className={cn(
            "grid grid-cols-1",
            !hasPartnerProfile &&
              "[mask-image:linear-gradient(black,transparent)]",
          )}
        >
          {sales.slice(0, hasPartnerProfile ? 3 : 1).map((sale, idx) => (
            <div
              key={sale.id}
              className={cn(
                "flex items-center justify-between gap-4 border-neutral-200 px-3 py-2.5",
                idx > 0 && "border-t",
              )}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-neutral-600">
                  {sale.customer.email}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-600">
                  {currencyFormatter(sale.earnings / 100, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
        {!hasPartnerProfile && (
          <p className="px-8 py-4 text-center text-xs text-neutral-500">
            To withdraw your earnings or view all of your sales, create a free
            Dub partner account below.
          </p>
        )}
      </div>
    ) : (
      <EmptyState />
    )
  ) : isLoading ? (
    <div className="mt-6 flex items-center justify-center">
      <LoadingSpinner className="size-4" />
    </div>
  ) : (
    <EmptyState />
  );
}

const EmptyState = () => {
  return (
    <div className="mt-2.5 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50">
      <Gift className="size-6 text-neutral-400" />
      <p className="max-w-60 text-pretty text-center text-xs text-neutral-400">
        No sales yet. When you refer a friend and they make a purchase, they'll
        show up here.
      </p>
    </div>
  );
};
