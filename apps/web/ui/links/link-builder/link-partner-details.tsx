import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, LinkProps } from "@/lib/types";
import { ArrowUpRight } from "@dub/ui/icons";
import { currencyFormatter, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";

const formatCurrency = (value: number) =>
  currencyFormatter(value / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function LinkPartnerDetails({
  link,
  partner,
}: {
  link: LinkProps;
  partner?: EnrolledPartnerProps;
}) {
  const { slug } = useWorkspace();

  return (
    <div>
      <Link
        href={`/${slug}/program/partners?partnerId=${link.partnerId}`}
        className="border-border-subtle group flex items-center justify-between overflow-hidden rounded-t-lg border bg-neutral-100 px-4 py-3"
        target="_blank"
      >
        <div className="flex min-w-0 items-center gap-3">
          {partner ? (
            <img
              src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
              alt={partner.name}
              className="size-8 rounded-full"
            />
          ) : (
            <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
          )}
          <div className="min-w-0">
            {partner ? (
              <span className="block truncate text-xs font-semibold leading-tight text-neutral-900">
                {partner.name}
              </span>
            ) : (
              <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
            )}

            {partner ? (
              partner.email && (
                <span className="block min-w-0 truncate text-xs font-medium leading-tight text-neutral-500">
                  {partner.email}
                </span>
              )
            ) : (
              <div className="mt-0.5 h-3 w-20 animate-pulse rounded bg-neutral-200" />
            )}
          </div>
        </div>
        <ArrowUpRight className="size-3 shrink-0 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      </Link>
      <div className="border-border-subtle grid grid-cols-1 divide-y divide-neutral-200 rounded-b-lg border-x border-b sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ["Revenue", partner ? formatCurrency(partner.saleAmount) : undefined],
          [
            "Commissions",
            partner ? formatCurrency(partner.totalCommissions) : undefined,
          ],
          [
            "Net revenue",
            partner ? formatCurrency(partner.netRevenue) : undefined,
          ],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3">
            <span className="text-xs font-medium text-neutral-500">
              {label}
            </span>
            {value !== undefined ? (
              <span className="text-sm font-medium text-neutral-900">
                {value}
              </span>
            ) : (
              <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
