import {
  AdminNetworkPartner,
  EnrolledPartnerExtendedProps,
  NetworkPartnerProps,
} from "@/lib/types";
import { CalendarIcon, Globe, OfficeBuilding, TimestampTooltip } from "@dub/ui";
import {
  TriangleWarning,
  UserArrowRight,
  Users,
  VerifiedBadge,
} from "@dub/ui/icons";
import { COUNTRIES, formatDate, formatDateTimeSmart } from "@dub/utils";
import { CircleMinus } from "lucide-react";
import { ReactNode, createElement } from "react";
import {
  getPayoutMethodIconConfig,
  getPayoutMethodLabel,
} from "./payouts/payout-method-config";
import { ReferredByPartner } from "./referred-by-partner";

export type BasicField = {
  id: string;
  icon: React.ReactElement;
  text: ReactNode | null | undefined;
  /** When set, the row is wrapped in TimestampTooltip (local / UTC / unix). */
  timestamp?: Date | string | number;
  /** Optional outer wrapper (e.g. ConversionScoreTooltip) around the row content. */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
};

export function getBasicFields({
  partner,
  isEnrolled,
  isAdmin,
  isNetwork,
  canCreateReferralReward,
}: {
  partner?:
    | EnrolledPartnerExtendedProps
    | NetworkPartnerProps
    | AdminNetworkPartner;
  isEnrolled: boolean;
  isAdmin: boolean;
  isNetwork: boolean;
  canCreateReferralReward: boolean;
}): BasicField[] {
  let basicFields: BasicField[] = [
    {
      id: "country",
      icon: partner?.country ? (
        <img
          alt={`Flag of ${COUNTRIES[partner.country]}`}
          src={`https://flag.vercel.app/m/${partner.country}.svg`}
          className="size-3.5 rounded-full"
        />
      ) : (
        <Globe className="size-3.5 shrink-0" />
      ),
      text: partner?.country ? COUNTRIES[partner.country] : "Planet Earth",
    },
    {
      id: "companyName",
      icon: <OfficeBuilding className="size-3.5" />,
      text: partner ? partner.companyName || null : undefined,
    },
  ];

  if ((isEnrolled || isAdmin) && partner) {
    const isPendingApplication =
      "status" in partner && partner.status === "pending";

    // This branch runs only for enrolled/admin partners. Cast to surface the
    // payout/referral fields that NetworkPartnerProps lacks — compile-time only,
    // with no runtime effect (absent fields already read as undefined).
    const detailPartner = partner as EnrolledPartnerExtendedProps;

    basicFields = basicFields.concat([
      {
        id: "createdAt",
        icon: isPendingApplication ? (
          <CalendarIcon className="size-3.5" />
        ) : (
          <Users className="size-3.5" />
        ),
        text: isPendingApplication ? (
          <span className="inline-flex flex-wrap items-center gap-1">
            <TimestampTooltip
              timestamp={partner.createdAt}
              rows={["local", "utc", "unix"]}
              side="left"
              delayDuration={250}
            >
              <span>Applied {formatDate(partner.createdAt)}</span>
            </TimestampTooltip>
          </span>
        ) : (
          `${isPendingApplication ? "Applied" : "Partner since"} ${formatDate(partner.createdAt)}`
        ),
        timestamp: isPendingApplication ? undefined : partner.createdAt,
      },
      {
        id: "payoutMethod" as const,
        icon: detailPartner.defaultPayoutMethod ? (
          createElement(
            getPayoutMethodIconConfig(detailPartner.defaultPayoutMethod).Icon,
            { className: "size-3.5 shrink-0" },
          )
        ) : (
          <CircleMinus className="size-3.5 shrink-0" />
        ),
        text:
          detailPartner.defaultPayoutMethod && detailPartner.payoutsEnabledAt
            ? `${getPayoutMethodLabel(detailPartner.defaultPayoutMethod)} connected ${formatDateTimeSmart(detailPartner.payoutsEnabledAt)}`
            : "No payout method connected",
        ...(detailPartner.payoutsEnabledAt
          ? { timestamp: detailPartner.payoutsEnabledAt }
          : {}),
      },
      // TODO: once more partners verify their identity, we can show this by default
      ...(partner.identityVerifiedAt
        ? [
            {
              id: "identityVerifiedAt",
              icon: partner.identityVerifiedAt ? (
                <VerifiedBadge className="size-3.5 shrink-0" />
              ) : (
                <TriangleWarning className="size-3.5 shrink-0" />
              ),
              text: partner.identityVerifiedAt
                ? `Identity verified ${formatDate(partner.identityVerifiedAt, { month: "short" })}`
                : "Identity not verified",
              ...(partner.identityVerifiedAt
                ? { timestamp: partner.identityVerifiedAt }
                : {}),
            },
          ]
        : []),

      // Referred by
      ...(isEnrolled && canCreateReferralReward
        ? [
            {
              id: "referredBy",
              icon: <UserArrowRight className="size-3.5 shrink-0" />,
              text: <ReferredByPartner partner={detailPartner} />,
            },
          ]
        : []),
    ]);
  }

  if (isNetwork) {
    basicFields = basicFields.concat([
      {
        id: "joinedAt",
        icon: <CalendarIcon className="size-3.5" />,
        text: partner ? `Joined ${formatDate(partner.createdAt!)}` : undefined,
        timestamp: partner?.createdAt,
      },
    ]);
  }

  return basicFields;
}
