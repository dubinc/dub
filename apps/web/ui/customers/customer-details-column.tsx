import { CustomerActivityResponse, CustomerProps } from "@/lib/types";
import { CopyButton, UTM_PARAMETERS } from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  getParamsFromURL,
  getPrettyUrl,
} from "@dub/utils";
import { useParams } from "next/navigation";
import { Fragment, HTMLProps, useMemo } from "react";
import DeviceIcon from "../analytics/device-icon";
import { ConditionalLink } from "../shared/conditional-link";

export function CustomerDetailsColumn({
  customer,
  customerActivity,
  isCustomerActivityLoading,
}: {
  customer?: Omit<
    CustomerProps,
    "name" | "externalId" | "sales" | "saleAmount"
  > & {
    name?: string;
    externalId?: string;
  };
  customerActivity?: CustomerActivityResponse;
  isCustomerActivityLoading: boolean;
}) {
  const { slug, programSlug } = useParams();

  const link = customerActivity?.link;
  const click = customerActivity?.events.find((e) => e.event === "click");

  const utmParams = useMemo(() => {
    if (!click?.url) return null;
    const allParams = getParamsFromURL(click.url);

    return UTM_PARAMETERS.map((p) => ({
      ...p,
      value: allParams?.[p.key],
    })).filter(({ value }) => value);
  }, [click?.url]);

  return (
    <div className="grid grid-cols-1 gap-6 overflow-hidden whitespace-nowrap text-sm text-neutral-900 min-[320px]:grid-cols-2 lg:grid-cols-1">
      <div className="flex flex-col gap-2">
        <DetailHeading>Details</DetailHeading>
        {customer ? (
          customer.country && (
            <ConditionalLink
              href={`/${programSlug ? `programs/${programSlug}` : slug}/analytics?country=${encodeURIComponent(customer.country)}`}
              target="_blank"
            >
              <div className="flex items-center gap-2">
                <img
                  src={`https://hatscripts.github.io/circle-flags/flags/${customer.country.toLowerCase()}.svg`}
                  alt=""
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{COUNTRIES[customer.country]}</span>
              </div>
            </ConditionalLink>
          )
        ) : (
          <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-100" />
        )}
        {click
          ? [
              {
                key: "device",
                icon: (
                  <DeviceIcon
                    display={capitalize(click.device)!}
                    tab="devices"
                    className="size-3.5 shrink-0"
                  />
                ),
                value: click.device,
              },
              {
                key: "browser",
                icon: (
                  <DeviceIcon
                    display={capitalize(click.browser)!}
                    tab="browsers"
                    className="size-3.5 shrink-0"
                  />
                ),
                value: click.browser,
              },
              {
                key: "os",
                icon: (
                  <DeviceIcon
                    display={capitalize(click.os)!}
                    tab="os"
                    className="size-3.5 shrink-0"
                  />
                ),
                value: click.os,
              },
            ]
              .filter(({ value }) => value)
              .map(({ key, icon, value }) => (
                <ConditionalLink
                  key={key}
                  href={`/${programSlug ? `programs/${programSlug}` : slug}/analytics?${key}=${encodeURIComponent(value)}`}
                  target="_blank"
                >
                  <span className="flex items-center gap-2">
                    {icon}
                    <span className="truncate">{value}</span>
                  </span>
                </ConditionalLink>
              ))
          : (isCustomerActivityLoading || !customer) && (
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            )}
      </div>

      <div className="flex flex-col gap-2">
        <DetailHeading>Customer since</DetailHeading>
        {customer ? (
          <span>
            {new Date(customer.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : (
          <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
        )}
      </div>

      {customer?.externalId && (
        <div className="flex flex-col gap-2">
          <DetailHeading>External ID</DetailHeading>
          {
            <div className="flex items-center gap-1">
              <span className="truncate">{customer.externalId}</span>
              <CopyButton
                value={customer.externalId}
                variant="neutral"
                className="p-1 [&>*]:h-3 [&>*]:w-3"
                successMessage="Copied external ID to clipboard!"
              />
            </div>
          }
        </div>
      )}

      <div className="flex flex-col gap-2">
        <DetailHeading>Lifetime value</DetailHeading>
        {!customer || isCustomerActivityLoading ? (
          <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
        ) : (
          <span>
            {customerActivity?.ltv !== undefined
              ? currencyFormatter(customerActivity.ltv / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "-"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <DetailHeading>Referral link</DetailHeading>
        {!customer || isCustomerActivityLoading ? (
          <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
        ) : link ? (
          <ConditionalLink
            href={`/${programSlug ? `programs/${programSlug}` : slug}/analytics?domain=${link.domain}&key=${link.key}`}
            target="_blank"
            className="min-w-0 overflow-hidden truncate"
          >
            {getPrettyUrl(link.shortLink)}
          </ConditionalLink>
        ) : (
          <span>-</span>
        )}
      </div>

      {utmParams && Boolean(utmParams.length) && (
        <div className="flex flex-col gap-2">
          <DetailHeading>UTM</DetailHeading>
          <div className="grid w-full grid-cols-[min-content,minmax(0,1fr)] gap-x-4 gap-y-2 overflow-hidden">
            {utmParams.map(({ key, label, value }) => (
              <Fragment key={key}>
                <span className="truncate">{label}</span>
                <ConditionalLink
                  href={`/${programSlug ? `programs/${programSlug}` : slug}/analytics?${key}=${encodeURIComponent(value)}`}
                  target="_blank"
                  className="truncate text-neutral-500"
                >
                  {value}
                </ConditionalLink>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DetailHeading = ({
  className,
  ...rest
}: HTMLProps<HTMLHeadingElement>) => (
  <h2
    className={cn("font-semibold text-neutral-900", className)}
    {...rest}
  ></h2>
);
