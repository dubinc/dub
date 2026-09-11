"use client";

import { usePartnerReferral } from "@/lib/partner-referrals/hooks/use-partner-referral";
import { constructPartnerReferralLink } from "@/lib/partner-referrals/utils";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import useDiscountCodes from "@/lib/swr/use-discount-codes";
import useGroup from "@/lib/swr/use-group";
import usePartner from "@/lib/swr/use-partner";
import useProgram from "@/lib/swr/use-program";
import { useProgramPartnerLinks } from "@/lib/swr/use-program-partner-links";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  DiscountCodeProps,
  EnrolledPartnerExtendedProps,
  EnrolledPartnerProps,
  GroupProps,
} from "@/lib/types";
import { useAddDiscountCodeModal } from "@/ui/modals/add-discount-code-modal";
import { useAddPartnerLinkModal } from "@/ui/modals/add-partner-link-modal";
import { DeleteDiscountCodeModal } from "@/ui/modals/delete-discount-code-modal";
import { DiscountCodeBadge } from "@/ui/partners/discounts/discount-code-badge";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CardList,
  CopyButton,
  CursorRays,
  InvoiceDollar,
  LoadingSpinner,
  MenuItem,
  Popover,
  Receipt2,
  Table,
  Tag,
  Tooltip,
  TooltipContent,
  UserCheck,
  useCopyToClipboard,
  useTable,
} from "@dub/ui";
import { Copy, Discount, Gift, Trash } from "@dub/ui/icons";
import {
  cn,
  currencyFormatter,
  getPrettyUrl,
  nFormatter,
  pluralize,
} from "@dub/utils";
import { DiscountProvider } from "@prisma/client";
import { Command } from "cmdk";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function ProgramPartnerLinksPage() {
  const { partnerId } = useParams() as { partnerId: string };
  const { partner, error } = usePartner({ partnerId });

  return partner ? (
    <div className="grid min-w-0 gap-4">
      <PartnerLinks partner={partner} />
      <PartnerDiscountCodes partner={partner} />
      <PartnerReferralLink partner={partner} />
    </div>
  ) : (
    <div className="flex justify-center py-16">
      {error ? (
        <span className="text-content-subtle text-sm">
          Failed to load partner links
        </span>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];

const formatStatCount = ({ count, unit }: { count: number; unit: string }) => ({
  count,
  formatted: nFormatter(count),
  tooltip: `${nFormatter(count, { full: true })} ${pluralize(unit, count)}`,
});

const PARTNER_LINK_STATS = [
  {
    id: "clicks",
    icon: CursorRays,
    event: "clicks",
    iconClassName: "data-[active=true]:text-blue-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.clicks,
        unit: "click",
      }),
  },
  {
    id: "leads",
    icon: UserCheck,
    event: "leads",
    iconClassName: "data-[active=true]:text-purple-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.leads,
        unit: "lead",
      }),
  },
  {
    id: "conversions",
    icon: Receipt2,
    event: "sales",
    iconClassName: "data-[active=true]:text-orange-500",
    getValue: (link: PartnerLink) =>
      formatStatCount({
        count: link.conversions,
        unit: "conversion",
      }),
  },
  {
    id: "revenue",
    icon: InvoiceDollar,
    event: "sales",
    iconClassName: "data-[active=true]:text-teal-500",
    getValue: (link: PartnerLink) => {
      const count = link.saleAmount;
      const formatted =
        count > 0
          ? currencyFormatter(count, {
              trailingZeroDisplay: "stripIfInteger",
            })
          : nFormatter(count);

      return {
        count,
        formatted,
        tooltip: `${formatted} revenue`,
      };
    },
  },
] as const;

const PartnerLinks = ({ partner }: { partner: EnrolledPartnerProps }) => {
  const { slug } = useWorkspace();

  const { group } = useGroup({
    groupIdOrSlug: partner.groupId,
  });

  const { AddPartnerLinkModal, setShowAddPartnerLinkModal } =
    useAddPartnerLinkModal({
      partner,
    });

  const { links, loading, error } = useProgramPartnerLinks({
    partnerId: partner.id,
  });

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">
          Referral links
        </h2>
        <Button
          variant="secondary"
          text="Create link"
          className="h-8 w-fit rounded-lg px-3 py-2 font-medium"
          onClick={() => setShowAddPartnerLinkModal(true)}
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-content-subtle rounded-xl border border-neutral-200 py-8 text-center text-sm">
          Failed to load partner links
        </div>
      ) : links && links.length > 0 ? (
        <CardList variant="compact">
          {links.map((link) => (
            <PartnerLinkCard
              key={link.id}
              link={link}
              group={group}
              slug={slug}
            />
          ))}
        </CardList>
      ) : (
        <div className="text-content-subtle rounded-xl border border-neutral-200 py-8 text-center text-sm">
          No links created
        </div>
      )}
      <AddPartnerLinkModal />
    </>
  );
};

function PartnerLinkCard({
  link,
  group,
  slug,
}: {
  link: PartnerLink;
  group?: Pick<GroupProps, "linkStructure"> | null;
  slug?: string;
}) {
  const partnerLink = constructPartnerLink({
    group,
    link,
  });

  return (
    <CardList.Card
      innerClassName="flex items-center justify-between gap-4 px-3 py-2.5"
      hoverStateEnabled={false}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={`/${slug}/links/${link.domain}/${link.key}`}
          target="_blank"
          className="text-content-default cursor-alias truncate text-sm font-medium decoration-dotted hover:underline"
        >
          {getPrettyUrl(partnerLink)}
        </Link>
        {/* {rewardEvents.length > 0 && (
          <div className="flex h-5 shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-1">
            {rewardEvents.map((event) => {
              const Icon = REWARD_EVENT_ICON[event];
              return <Icon key={event} className="size-3 text-neutral-700" />;
            })}
          </div>
        )} */}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {PARTNER_LINK_STATS.map(
          ({ id, icon: Icon, event, getValue, iconClassName }) => {
            const { count, formatted, tooltip } = getValue(link);

            return (
              <Tooltip
                key={id}
                content={
                  <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                    {tooltip}
                  </div>
                }
              >
                <Link
                  href={`/${slug}/events?event=${event}&interval=all&domain=${link.domain}&key=${link.key}`}
                  target="_blank"
                  className="flex items-center gap-1.5"
                >
                  <Icon
                    data-active={count > 0}
                    className={cn(
                      "size-4 shrink-0 text-neutral-400",
                      iconClassName,
                    )}
                  />
                  <span className="text-xs font-medium text-neutral-700">
                    {formatted}
                  </span>
                </Link>
              </Tooltip>
            );
          },
        )}

        <PartnerLinkCardMenu partnerLink={partnerLink} />
      </div>
    </CardList.Card>
  );
}

function PartnerLinkCardMenu({ partnerLink }: { partnerLink: string }) {
  const [openPopover, setOpenPopover] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[150px]">
            <MenuItem
              as={Command.Item}
              icon={Copy}
              onSelect={() => {
                toast.promise(copyToClipboard(partnerLink), {
                  success: "Copied to clipboard",
                });
                setOpenPopover(false);
              }}
            >
              Copy link
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Gift}
              onSelect={() => setOpenPopover(false)}
            >
              Edit reward
            </MenuItem>
            <MenuItem
              as={Command.Item}
              icon={Discount}
              onSelect={() => setOpenPopover(false)}
            >
              Edit discount
            </MenuItem>
          </Command.List>
        </Command>
      }
    >
      <Button
        type="button"
        variant="outline"
        className="size-6 shrink-0 rounded-lg p-0"
        icon={<ThreeDots className="size-3.5 shrink-0" />}
      />
    </Popover>
  );
}

const PartnerReferralLink = ({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) => {
  const { slug } = useWorkspace();
  const router = useRouter();
  const {
    program,
    loading: loadingProgram,
    error: errorProgram,
  } = useProgram();
  const {
    referral,
    loading: loadingReferral,
    error: referralError,
  } = usePartnerReferral({
    partnerId: partner.id,
  });

  const referralLink = constructPartnerReferralLink({
    partner,
    program,
  });

  const data = useMemo(() => {
    if (!referralLink || !referral?.stats) {
      return [];
    }

    return [
      {
        link: referralLink,
        totalPartners: referral.stats.totalPartners,
        totalConversions: referral.stats.totalConversions,
        totalSaleAmount: referral.stats.totalSaleAmount,
      },
    ];
  }, [referralLink, referral]);

  const referredPartnersUrl = `/${slug}/program/partners?referredByPartnerId=${partner.id}`;

  const table = useTable({
    data,
    columns: [
      {
        id: "link",
        header: "Link",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="font-medium text-black">
              {getPrettyUrl(row.original.link)}
            </span>
            <CopyButton value={row.original.link} className="p-0.5" />
          </div>
        ),
      },
      {
        header: "Partners",
        size: 1,
        minSize: 1,
        cell: ({ row }) => nFormatter(row.original.totalPartners),
      },
      {
        header: "Conversions",
        size: 1,
        minSize: 1,
        cell: ({ row }) => nFormatter(row.original.totalConversions),
      },
      {
        header: "Revenue",
        size: 1,
        minSize: 1,
        cell: ({ row }) =>
          currencyFormatter(row.original.totalSaleAmount, {
            trailingZeroDisplay: "stripIfInteger",
          }),
      },
    ],
    onRowClick: (_row, e) => {
      if (e.metaKey || e.ctrlKey) window.open(referredPartnersUrl, "_blank");
      else router.push(referredPartnersUrl);
    },
    onRowAuxClick: () => window.open(referredPartnersUrl, "_blank"),
    rowProps: () => ({
      onPointerEnter: () => router.prefetch(referredPartnersUrl),
    }),
    resourceName: (p) => `link${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading: loadingReferral || loadingProgram,
    error:
      referralError || errorProgram
        ? "Failed to load partner referral data"
        : undefined,
  });

  if (!partner?.referralRewardId) {
    return null;
  }

  return (
    <>
      <h2 className="text-content-emphasis text-lg font-semibold">
        Partner referral link
      </h2>
      <Table {...table} />
    </>
  );
};

const PartnerDiscountCodes = ({
  partner,
}: {
  partner: EnrolledPartnerExtendedProps;
}) => {
  const { slug, stripeConnectId, shopifyStoreId } = useWorkspace();
  const { group } = useGroup({
    groupIdOrSlug: partner.groupId ?? undefined,
  });

  const [selectedDiscountCode, setSelectedDiscountCode] =
    useState<DiscountCodeProps | null>(null);

  const [showDeleteDiscountCodeModal, setShowDeleteDiscountCodeModal] =
    useState(false);

  const { discountCodes, loading, error } = useDiscountCodes({
    partnerId: partner.id || null,
  });

  const { links } = useProgramPartnerLinks({
    partnerId: partner.id || null,
  });

  const { AddDiscountCodeModal, setShowAddDiscountCodeModal } =
    useAddDiscountCodeModal({
      partner,
    });

  const table = useTable({
    data: discountCodes || [],
    columns: [
      {
        id: "code",
        header: "Code",
        cell: ({ row }) => (
          <DiscountCodeBadge
            code={row.original.code}
            disabledAt={row.original.disabledAt}
          />
        ),
      },
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => {
          const link = links?.find((l) => l.id === row.original.linkId);
          return link ? (
            <Link
              href={`/${slug}/links/${link.domain}/${link.key}`}
              target="_blank"
              className="cursor-alias font-medium text-black decoration-dotted hover:underline"
            >
              {getPrettyUrl(link.shortLink)}
            </Link>
          ) : (
            <span className="text-neutral-500">Link not found</span>
          );
        },
      },
      {
        id: "menu",
        enableHiding: false,
        minSize: 28,
        size: 28,
        maxSize: 28,
        cell: ({ row }) => (
          <Button
            icon={<Trash className="size-3.5 shrink-0 text-neutral-600" />}
            variant="outline"
            className="size-8 whitespace-nowrap"
            onClick={() => {
              setSelectedDiscountCode(row.original);
              setShowDeleteDiscountCodeModal(true);
            }}
          />
        ),
      },
    ],
    resourceName: (p) => `discount code${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    loading,
    error: error ? "Failed to load discount codes" : undefined,
  } as any);

  const disabledReason = useMemo(() => {
    if (!partner.discount) {
      return "No discount assigned to this partner group. Please add a discount before you can create a discount code.";
    }

    if (
      partner.discount.provider === DiscountProvider.stripe &&
      !stripeConnectId
    ) {
      return (
        <TooltipContent
          title="Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount codes."
          cta="Install Stripe app"
          href={`/${slug}/settings/integrations/stripe`}
          target="_blank"
        />
      );
    }

    if (
      partner.discount.provider === DiscountProvider.shopify &&
      !shopifyStoreId
    ) {
      return (
        <TooltipContent
          title="Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create discount codes."
          cta="Install Shopify app"
          href={`/${slug}/settings/integrations/shopify`}
          target="_blank"
        />
      );
    }

    if (links?.length === 0) {
      return "No links assigned to this partner group. Please add a link before you can create a discount code.";
    }

    if (links?.length === discountCodes?.length) {
      return "All links have a discount code assigned to them. Please add a new link before you can create a discount code.";
    }

    return undefined;
  }, [partner.discount, links, discountCodes, stripeConnectId, shopifyStoreId]);

  const groupDiscount = group?.discount ?? partner.discount;

  const discountCodeEmptyState = groupDiscount
    ? {
        description:
          "Great for short-form content, podcasts and more. Works alongside link-based discounts.",
        buttonText: "Learn more",
        buttonHref:
          "https://dub.co/help/article/dual-sided-incentives#option-2-using-stripe-promo-codes-no-code-required",
      }
    : {
        description:
          "You need to create a group discount for this partner before you can create a discount code.",
        buttonText: "Create group discount",
        buttonHref: group?.slug
          ? `/${slug}/program/groups/${group.slug}/discounts`
          : `/${slug}/program/groups`,
      };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-content-emphasis text-lg font-semibold">
          Discount codes
        </h2>
        <Button
          variant="secondary"
          text="Create code"
          className="h-8 w-fit rounded-lg px-3 py-2 font-medium"
          onClick={() => setShowAddDiscountCodeModal(true)}
          disabled={!!disabledReason}
          disabledTooltip={disabledReason}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : !error && (!discountCodes || discountCodes.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-6">
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <Tag className="mb-2 size-6 text-neutral-900" />
            <h3 className="text-content-emphasis text-sm font-semibold leading-5">
              No discount codes created
            </h3>
            <p className="text-content-subtle -mt-1 text-sm font-medium leading-5">
              {discountCodeEmptyState.description}
            </p>
            {discountCodeEmptyState.buttonHref && (
              <ButtonLink
                href={discountCodeEmptyState.buttonHref}
                target={
                  discountCodeEmptyState.buttonHref.startsWith("https")
                    ? "_blank"
                    : undefined
                }
                variant="secondary"
                className="mt-2 h-7 rounded-md px-3 text-sm font-medium"
              >
                {discountCodeEmptyState.buttonText}
              </ButtonLink>
            )}
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center py-16">
          <span className="text-content-subtle text-sm">
            Failed to load discount codes
          </span>
        </div>
      ) : (
        <Table {...table} />
      )}

      <AddDiscountCodeModal />

      {selectedDiscountCode && (
        <DeleteDiscountCodeModal
          showModal={showDeleteDiscountCodeModal}
          setShowModal={setShowDeleteDiscountCodeModal}
          discountCode={selectedDiscountCode}
        />
      )}
    </>
  );
};
