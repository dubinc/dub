"use client";

import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { PARTNER_LEVEL_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import useDiscountCodes from "@/lib/swr/use-discount-codes";
import { useDiscounts } from "@/lib/swr/use-discounts";
import useGroup from "@/lib/swr/use-group";
import {
  ProgramPartnerLinkExtended,
  useProgramPartnerLinks,
} from "@/lib/swr/use-program-partner-links";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  DiscountCodeProps,
  DiscountProps,
  EnrolledPartnerExtendedProps,
  EnrolledPartnerProps,
  GroupProps,
} from "@/lib/types";
import { useAddDiscountCodeModal } from "@/ui/modals/add-discount-code-modal";
import { DeleteDiscountCodeModal } from "@/ui/modals/delete-discount-code-modal";
import { useEditPartnerDiscountModal } from "@/ui/modals/edit-partner-discount-modal";
import { useAdvancedUpsellModal } from "@/ui/partners/advanced-upsell-modal";
import { DiscountCodeBadge } from "@/ui/partners/discounts/discount-code-badge";
import { ButtonLink } from "@/ui/placeholders/button-link";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CardList,
  LoadingSpinner,
  MenuItem,
  Popover,
  Tooltip,
  TooltipContent,
  useCopyToClipboard,
} from "@dub/ui";
import { DiscountCode, Trash } from "@dub/ui/icons";
import { cn, getPrettyUrl, nFormatter, pluralize } from "@dub/utils";
import { DiscountProvider } from "@prisma/client";
import { Command } from "cmdk";
import Link from "next/link";
import { type ReactNode, useCallback, useMemo, useState } from "react";

type PartnerLink = ProgramPartnerLinkExtended;
type PartnerForDiscountOverride = Pick<
  EnrolledPartnerProps,
  "id" | "name" | "email" | "image" | "groupId" | "discountId"
>;

function getEffectiveDiscountProvider({
  link,
  discounts,
  partnerDiscount,
  groupDiscount,
}: {
  link: PartnerLink;
  discounts?: DiscountProps[] | null;
  partnerDiscount?: Pick<DiscountProps, "id" | "provider"> | null;
  groupDiscount?: Pick<DiscountProps, "id" | "provider"> | null;
}): DiscountProvider | null {
  const linkDiscount = discounts?.find((d) => d.id === link.discount);

  return (
    linkDiscount?.provider ??
    partnerDiscount?.provider ??
    groupDiscount?.provider ??
    null
  );
}

function linkHasEffectiveDiscount({
  link,
  partnerDiscount,
  groupDiscount,
}: {
  link: PartnerLink;
  partnerDiscount?: Pick<DiscountProps, "id"> | null;
  groupDiscount?: Pick<DiscountProps, "id"> | null;
}) {
  return Boolean(link.discount || partnerDiscount?.id || groupDiscount?.id);
}

export function PartnerDiscountCodes({
  partner,
}: {
  partner: EnrolledPartnerExtendedProps;
}) {
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

  const { discounts } = useDiscounts({
    groupId: partner.groupId ?? undefined,
  });

  const getDiscountProvider = useCallback(
    (linkId: string) => {
      const link = links?.find((item) => item.id === linkId);
      if (!link) return null;

      return getEffectiveDiscountProvider({
        link,
        discounts,
        partnerDiscount: partner.discount,
        groupDiscount: group?.discount,
      });
    },
    [links, discounts, partner.discount, group?.discount],
  );

  const { AddDiscountCodeModal, setShowAddDiscountCodeModal } =
    useAddDiscountCodeModal({
      partner,
      getDiscountProvider,
    });

  const usedLinkIds = useMemo(
    () => new Set(discountCodes?.map((code) => code.linkId) ?? []),
    [discountCodes],
  );

  const eligibleLinks = useMemo(() => {
    if (!links) {
      return [];
    }

    return links.filter(
      (link) =>
        !usedLinkIds.has(link.id) &&
        linkHasEffectiveDiscount({
          link,
          partnerDiscount: partner.discount,
          groupDiscount: group?.discount,
        }),
    );
  }, [links, usedLinkIds, partner.discount, group?.discount]);

  const disabledReason = useMemo(() => {
    if (!links || links.length === 0) {
      return "No links assigned to this partner group. Please add a link before you can create a discount code.";
    }

    if (eligibleLinks.length === 0) {
      if (links.length === discountCodes?.length) {
        return "All links have a discount code assigned to them. Please add a new link before you can create a discount code.";
      }

      return "No discount assigned to this partner or their links. Please add a discount before you can create a discount code.";
    }

    const providers = new Set(
      eligibleLinks
        .map((link) =>
          getEffectiveDiscountProvider({
            link,
            discounts,
            partnerDiscount: partner.discount,
            groupDiscount: group?.discount,
          }),
        )
        .filter(Boolean),
    );

    if (providers.has(DiscountProvider.stripe) && !stripeConnectId) {
      return (
        <TooltipContent
          title="Your workspace isn't connected to Stripe yet. Please install the Dub Stripe app in settings to create discount codes."
          cta="Install Stripe app"
          href={`/${slug}/settings/integrations/stripe`}
          target="_blank"
        />
      );
    }

    if (providers.has(DiscountProvider.shopify) && !shopifyStoreId) {
      return (
        <TooltipContent
          title="Your workspace isn't connected to Shopify yet. Please install the Dub Shopify app in settings to create discount codes."
          cta="Install Shopify app"
          href={`/${slug}/settings/integrations/shopify`}
          target="_blank"
        />
      );
    }

    return undefined;
  }, [
    links,
    eligibleLinks,
    discountCodes,
    discounts,
    partner.discount,
    group?.discount,
    stripeConnectId,
    shopifyStoreId,
    slug,
  ]);

  const hasPartnerOrLinkDiscount = Boolean(
    partner.discount?.id ||
      group?.discount?.id ||
      links?.some((link) => link.discount) ||
      eligibleLinks.length > 0,
  );

  const discountCodeEmptyState = hasPartnerOrLinkDiscount
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
            <DiscountCode className="mb-2 size-6 text-neutral-900" />
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
        <CardList variant="compact">
          {discountCodes?.map((discountCode) => {
            const link = links?.find((l) => l.id === discountCode.linkId);

            return (
              <DiscountCodeCard
                key={discountCode.id}
                discountCode={discountCode}
                link={link}
                partner={partner}
                group={group}
                slug={slug}
                onDelete={() => {
                  setSelectedDiscountCode(discountCode);
                  setShowDeleteDiscountCodeModal(true);
                }}
              />
            );
          })}
        </CardList>
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
}

function DiscountCodeCard({
  discountCode,
  link,
  partner,
  group,
  slug,
  onDelete,
}: {
  discountCode: DiscountCodeProps;
  link?: PartnerLink;
  partner: PartnerForDiscountOverride;
  group?: GroupProps | null;
  slug?: string;
  onDelete: () => void;
}) {
  const { plan } = useWorkspace();
  const { canUseAdvancedRewardLogic } = getPlanCapabilities(plan);
  const { advancedUpsellModal, setShowAdvancedUpsellModal } =
    useAdvancedUpsellModal();

  const partnerLink = link ? constructPartnerLink({ group, link }) : "";
  const hasDiscountOverride = Boolean(link?.discount);
  const conversions = link?.conversions ?? 0;

  const { EditPartnerDiscountModal, setShowEditPartnerDiscountModal } =
    useEditPartnerDiscountModal({
      target: link ? { type: "link", link, partner } : null,
      group,
    });

  const editDiscountDisabledTooltip = !link ? (
    "Link not found"
  ) : !canUseAdvancedRewardLogic ? (
    <TooltipContent
      title={PARTNER_LEVEL_REWARDS_PLAN_ERROR}
      cta="Upgrade to Advanced"
      onClick={() => setShowAdvancedUpsellModal(true)}
    />
  ) : undefined;

  return (
    <>
      {advancedUpsellModal}
      <CardList.Card
        innerClassName="flex items-center justify-between gap-4 px-3 py-2.5"
        hoverStateEnabled={false}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="w-40 shrink-0">
            <DiscountCodeBadge
              code={discountCode.code}
              disabledAt={discountCode.disabledAt}
            />
          </div>

          {link ? (
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/${slug}/links/${link.domain}/${link.key}`}
                target="_blank"
                className="text-content-default cursor-alias truncate text-sm font-medium decoration-dotted hover:underline"
              >
                {getPrettyUrl(partnerLink)}
              </Link>
              {hasDiscountOverride && (
                <Tooltip
                  content={
                    <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                      This link has a discount override
                    </div>
                  }
                >
                  <div className="flex h-5 shrink-0 items-center justify-center rounded-md bg-neutral-100 px-1">
                    <DiscountCode className="size-3 text-neutral-700" />
                  </div>
                </Tooltip>
              )}
            </div>
          ) : (
            <span className="text-sm text-neutral-500">Link not found</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {link && (
            <Tooltip
              content={
                <div className="whitespace-nowrap px-3 py-2 text-sm text-neutral-600">
                  {nFormatter(conversions, { full: true })}{" "}
                  {pluralize("conversion", conversions)}
                </div>
              }
            >
              <Link
                href={`/${slug}/events?event=sales&interval=all&domain=${link.domain}&key=${link.key}`}
                target="_blank"
                className="flex items-center gap-1.5"
              >
                <DiscountCode
                  data-active={conversions > 0}
                  className={cn(
                    "size-4 shrink-0 text-neutral-400",
                    "data-[active=true]:text-green-600",
                  )}
                />
                <span className="text-xs font-medium text-neutral-700">
                  {nFormatter(conversions)}
                </span>
              </Link>
            </Tooltip>
          )}

          <DiscountCodeCardMenu
            code={discountCode.code}
            partnerLink={partnerLink}
            onDelete={onDelete}
            onEditDiscount={() => setShowEditPartnerDiscountModal(true)}
            editDiscountDisabledTooltip={editDiscountDisabledTooltip}
          />
        </div>
      </CardList.Card>
      <EditPartnerDiscountModal />
    </>
  );
}

function DiscountCodeCardMenu({
  code,
  partnerLink,
  onDelete,
  onEditDiscount,
  editDiscountDisabledTooltip,
}: {
  code: string;
  partnerLink: string;
  onDelete: () => void;
  onEditDiscount: () => void;
  editDiscountDisabledTooltip?: ReactNode;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <Popover
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
      content={
        <Command tabIndex={0} loop className="focus:outline-none">
          <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
            <MenuItem
              as={Command.Item}
              icon={DiscountCode}
              disabledTooltip={editDiscountDisabledTooltip}
              onSelect={() => {
                setOpenPopover(false);
                onEditDiscount();
              }}
            >
              Edit discount
            </MenuItem>
            <MenuItem
              as={Command.Item}
              variant="danger"
              icon={Trash}
              onSelect={() => {
                setOpenPopover(false);
                onDelete();
              }}
            >
              Delete discount code
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
