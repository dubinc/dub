import { CustomerActivityResponse, CustomerEnriched } from "@/lib/types";
import {
  CopyText,
  Envelope,
  Globe,
  Hyperlink,
  TimestampTooltip,
  UTM_PARAMETERS,
} from "@dub/ui";
import {
  capitalize,
  cn,
  COUNTRIES,
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
  isProgramPage = false,
  workspaceSlug,
}: {
  customer?: Omit<
    CustomerEnriched,
    "name" | "externalId" | "sales" | "saleAmount"
  > & {
    name?: string | null;
    externalId?: string;
  };
  customerActivity?: CustomerActivityResponse;
  isCustomerActivityLoading: boolean;
  isProgramPage?: boolean;
  workspaceSlug?: string;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();

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

  const partner = customer?.partner;
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
    <div className="grid grid-cols-1 gap-6 overflow-hidden whitespace-nowrap text-sm text-neutral-900">
      <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
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

            {customer ? (
              <div className="text-content-default bg-bg-emphasis rounded-md px-1 text-xs font-medium">
                Since{" "}
                <TimestampTooltip
                  timestamp={customer.createdAt}
                  rows={["local", "utc", "unix"]}
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
              </div>
            ) : (
              <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-100" />
            )}
          </div>

          <div className="mt-3">
            {customer ? (
              <div className="flex items-center gap-2">
                <span className="text-content-emphasis text-base font-semibold">
                  {customer.name || customer.email}
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
                      <span className="min-w-0 truncate text-xs font-medium">
                        {text}
                      </span>
                    </>
                  ) : (
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="@md/page:grid-cols-2 @3xl/page:grid-cols-1 grid grid-cols-1 gap-5 p-4 text-xs">
          <div>
            <h2 className="text-content-emphasis text-sm font-semibold">
              Details
            </h2>

            <div className="mt-2.5 flex flex-col gap-5 text-xs">
              <div className="flex flex-col gap-2">
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
                              : `/${workspaceSlug || `programs/${programSlug}`}/${isProgramPage ? "program/" : ""}analytics?${key}=${encodeURIComponent(value)}`
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
                <div className="flex flex-col gap-2.5">
                  <DetailHeading>External ID</DetailHeading>
                  <div>
                    <CopyText
                      value={customer.externalId}
                      className="truncate text-xs"
                    >
                      {customer.externalId}
                    </CopyText>
                  </div>
                </div>
              )}
            </div>
          </div>

          {utmParams && Boolean(utmParams.length) && (
            <div className="flex flex-col gap-5 text-xs">
              <div className="flex flex-col gap-2.5">
                <DetailHeading>UTM</DetailHeading>
                <div className="grid w-full grid-cols-[min-content,minmax(0,1fr)] gap-x-4 gap-y-2 overflow-hidden">
                  {utmParams.map(({ key, label, value }) => (
                    <Fragment key={key}>
                      <span className="truncate">{label}</span>
                      <ConditionalLink
                        href={
                          workspaceSlug
                            ? `/${workspaceSlug}/${isProgramPage ? "program/" : ""}analytics?${key}=${encodeURIComponent(value)}`
                            : undefined
                        }
                        target="_blank"
                        className="truncate text-neutral-500"
                      >
                        {value}
                      </ConditionalLink>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {(link || !customer) && (
        <div className="border-border-subtle rounded-lg border p-4">
          <h2 className="text-content-emphasis mb-2.5 text-sm font-semibold">
            Referral {partner ? "partner" : "link"}
          </h2>

          {partner && (
            <div className="mb-4 flex items-center gap-2">
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                alt=""
                className="size-5 rounded-full"
              />
              <ConditionalLink
                href={
                  workspaceSlug
                    ? `/${workspaceSlug}/program/partners/${partner.id}`
                    : undefined
                }
                target="_blank"
                className="min-w-0 overflow-hidden truncate text-xs font-semibold"
              >
                {partner.name}
              </ConditionalLink>
            </div>
          )}

          <div className="flex flex-col gap-2 text-xs">
            {partner && <DetailHeading>Referral link</DetailHeading>}
            {!customer || isCustomerActivityLoading ? (
              <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            ) : link ? (
              <div className="flex items-center gap-1.5">
                <Hyperlink className="size-3.5 shrink-0" />
                <ConditionalLink
                  href={
                    workspaceSlug
                      ? `/${workspaceSlug}/links/${link.domain}/${link.key}`
                      : programSlug
                        ? `/programs/${programSlug}/analytics?domain=${encodeURIComponent(link.domain)}&key=${encodeURIComponent(link.key)}`
                        : undefined
                  }
                  target="_blank"
                  className="min-w-0 overflow-hidden truncate"
                >
                  {getPrettyUrl(link.shortLink)}
                </ConditionalLink>
              </div>
            ) : (
              <span>-</span>
            )}
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
  <h3
    className={cn("text-content-emphasis text-xs font-semibold", className)}
    {...rest}
  />
);
