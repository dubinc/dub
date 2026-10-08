import {
  ActivityLog,
  DiscountProps,
  LinkProps,
  RewardProps,
} from "@/lib/types";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { linkConstructor } from "@dub/utils";
import { Fragment, ReactNode } from "react";
import { ActivityValueChip, UserChip } from "../activity-entry-chips";

type RewardSnapshot = Pick<
  RewardProps,
  | "id"
  | "event"
  | "type"
  | "amountInCents"
  | "amountInPercentage"
  | "maxDuration"
  | "description"
  | "tooltipDescription"
  | "modifiers"
  | "config"
  | "spendLimitAmount"
  | "spendLimitInterval"
>;

type DiscountSnapshot = Pick<
  DiscountProps,
  "id" | "amount" | "type" | "maxDuration" | "description"
>;

type FieldDiff<T> = {
  old: T | { id: string } | null;
  new: T | { id: string } | null;
};

const REWARD_FIELDS = [
  { key: "clickReward", label: "Click reward" },
  { key: "leadReward", label: "Lead reward" },
  { key: "saleReward", label: "Sale reward" },
] as const;

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-neutral-800">{children}</span>
  );
}

function getChangeVerb(oldValue: unknown, newValue: unknown) {
  if (!newValue) {
    return "removed";
  }

  if (!oldValue) {
    return "set to";
  }

  return "updated to";
}

function isRewardSnapshot(value: unknown): value is RewardSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "event" in value &&
    typeof value.event === "string"
  );
}

function isDiscountSnapshot(value: unknown): value is DiscountSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    "type" in value
  );
}

function isLinkSnapshot(
  value: unknown,
): value is Pick<LinkProps, "id" | "domain" | "key"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "domain" in value &&
    "key" in value &&
    typeof (value as Pick<LinkProps, "domain">).domain === "string" &&
    typeof (value as Pick<LinkProps, "key">).key === "string"
  );
}

function OnLink({ log }: { log: ActivityLog }) {
  const diff = log.changeSet?.link as
    | FieldDiff<Pick<LinkProps, "id" | "domain" | "key">>
    | undefined;
  const link = diff?.new ?? diff?.old;

  if (!isLinkSnapshot(link)) {
    return null;
  }

  return (
    <>
      <Label>on</Label>
      <ActivityValueChip>
        {linkConstructor({
          domain: link.domain,
          key: link.key,
          pretty: true,
        })}
      </ActivityValueChip>
    </>
  );
}

function RewardValueChip({ value }: { value: unknown }) {
  return (
    <ActivityValueChip>
      {isRewardSnapshot(value) ? (
        <ProgramRewardDescription reward={value} showModifiersTooltip={false} />
      ) : (
        "Deleted reward"
      )}
    </ActivityValueChip>
  );
}

function DiscountValueChip({ value }: { value: unknown }) {
  return (
    <ActivityValueChip>
      {isDiscountSnapshot(value)
        ? formatDiscountDescription(value)
        : "Deleted discount"}
    </ActivityValueChip>
  );
}

function ByUser({ user }: { user: ActivityLog["user"] }) {
  if (!user) {
    return null;
  }

  return (
    <>
      <Label>by</Label>
      <UserChip user={user} />
    </>
  );
}

export function PartnerRewardChangedRenderer({ log }: { log: ActivityLog }) {
  const changes = REWARD_FIELDS.flatMap(({ key, label }) => {
    const diff = log.changeSet?.[key] as FieldDiff<RewardSnapshot> | undefined;

    if (!diff) {
      return [];
    }

    const verb = getChangeVerb(diff.old, diff.new);

    return [
      {
        key,
        label,
        verb,
        value: verb === "removed" ? null : diff.new,
      },
    ];
  });

  if (changes.length === 0) {
    return (
      <>
        <span>Reward updated</span>
        <OnLink log={log} />
        <ByUser user={log.user} />
      </>
    );
  }

  return (
    <>
      {changes.map((change, index) => (
        <Fragment key={change.key}>
          {index > 0 ? <Label>and</Label> : null}
          <Label>
            {change.label} {change.verb}
          </Label>
          {change.value ? <RewardValueChip value={change.value} /> : null}
        </Fragment>
      ))}
      <OnLink log={log} />
      <ByUser user={log.user} />
    </>
  );
}

export function PartnerDiscountChangedRenderer({ log }: { log: ActivityLog }) {
  const discountChange = log.changeSet?.discount as
    | FieldDiff<DiscountSnapshot>
    | undefined;

  if (!discountChange) {
    return (
      <>
        <span>Discount updated</span>
        <OnLink log={log} />
        <ByUser user={log.user} />
      </>
    );
  }

  const verb = getChangeVerb(discountChange.old, discountChange.new);

  return (
    <>
      <Label>Discount {verb}</Label>
      {verb !== "removed" ? (
        <DiscountValueChip value={discountChange.new} />
      ) : null}
      <OnLink log={log} />
      <ByUser user={log.user} />
    </>
  );
}
