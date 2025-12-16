import { CustomerActivityResponse, CustomerProps } from "@/lib/types";
import {
  CopyButton,
  CopyText,
  Envelope,
  Globe,
  TimestampTooltip,
  UTM_PARAMETERS,
} from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
  currencyFormatter,
  getParamsFromURL,
  getPrettyUrl,
  OG_AVATAR_URL,
} from "@dub/utils";
import { useParams } from "next/navigation";
import { Fragment, HTMLProps, useMemo } from "react";
import { DeviceIcon } from "../analytics/device-icon";
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

  const basicFields = [
    ...(!customer || customer?.email
      ? [
          {
            id: "email",
            icon: <Envelope className="size-3.5 shrink-0" />,
            text: customer?.email,
          },
        ]
      : []),
    {
      id: "country",
      icon: customer?.country ? (
        <img
          alt={`Flag of ${COUNTRIES[customer.country]}`}
          src={`https://flag.vercel.app/m/${customer.country}.svg`}
          className="size-3.5 rounded-full"
        />
      ) : (
        <Globe className="size-3.5 shrink-0" />
      ),
      text: customer?.country ? COUNTRIES[customer.country] : "Planet Earth",
    },
  ];

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
      <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
        <div className="p-4">
          <div className="flex justify-between gap-2">
            <div className="relative w-fit">
              {customer ? (
                <img
                  src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
                  alt={customer.id}
                  className="size-10 rounded-full border border-neutral-100"
                />
              ) : (
                <div className="size-10 animate-pulse rounded-full bg-neutral-200" />
              )}
            </div>

            {/* TODO: Since {date} */}
          </div>

          <div className="mt-3">
            {customer ? (
              <div className="flex items-center gap-2">
                <span className="text-content-emphasis text-base font-semibold">
                  {customer.name}
                </span>
              </div>
            ) : (
              <div className="h-7 w-24 animate-pulse rounded bg-neutral-200" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {basicFields
            .filter(({ text }) => text !== null)
            .map(({ id, icon, text }) => (
              <div key={id}>
                <div className="text-content-default flex items-center gap-1.5">
                  {text !== undefined ? (
                    <>
                      {icon}
                      <span className="text-xs font-medium">{text}</span>
                    </>
                  ) : (
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-6 p-4">
          <div className="flex flex-col gap-2">
            <DetailHeading>Details</DetailHeading>
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
                      href={
                        value === "Unknown"
                          ? undefined
                          : `/${programSlug ? `programs/${programSlug}` : slug}/analytics?${key}=${encodeURIComponent(value)}`
                      }
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

          {customer?.externalId && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-content-emphasis text-sm font-semibold">
                External ID
              </h3>
              <div className="flex items-center gap-1">
                <CopyText value={customer.externalId} className="truncate">
                  {customer.externalId}
                </CopyText>
                <CopyButton
                  value={customer.externalId}
                  variant="neutral"
                  className="p-1 [&>*]:h-3 [&>*]:w-3"
                  successMessage="Copied external ID to clipboard!"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="[&>*]:border [&>*]:border-red-500">
        <div className="flex flex-col gap-2">
          <DetailHeading>Customer since</DetailHeading>
          {customer ? (
            <TimestampTooltip
              timestamp={customer.createdAt}
              rows={["local"]}
              side="left"
            >
              <span>
                {new Date(customer.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </TimestampTooltip>
          ) : (
            <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DetailHeading>Lifetime value</DetailHeading>
          {!customer || isCustomerActivityLoading ? (
            <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
          ) : (
            <span>
              {customerActivity?.ltv !== undefined
                ? currencyFormatter(customerActivity.ltv, {
                    trailingZeroDisplay: "stripIfInteger",
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
              href={
                programSlug
                  ? `/programs/${programSlug}/analytics?domain=${link.domain}&key=${link.key}`
                  : `/${slug}/links/${link.domain}/${link.key}`
              }
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
    </div>
  );
}

const DetailHeading = ({
  className,
  ...rest
}: HTMLProps<HTMLHeadingElement>) => (
  <h2
    className={cn("text-content-emphasis text-sm font-semibold", className)}
    {...rest}
  />
);
