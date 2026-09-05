"use client";

import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import {
  Badge,
  Copy,
  CopyButton,
  StatusBadge,
  Tick,
  useCopyToClipboard,
} from "@dub/ui";
import { ArrowUpRight2 } from "@dub/ui/icons";
import {
  APP_DOMAIN,
  capitalize,
  currencyFormatter,
  formatDate,
  getPrettyUrl,
  isSafeLinkHref,
  isWorkspaceBillingTrialActive,
  nFormatter,
} from "@dub/utils";
import { toast } from "sonner";

export interface UserInfoProps {
  email: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    planPeriod: string | null;
    trialEndsAt: string | Date | null;
    events: number;
    links: number;
    statsInterval: "30d" | "all";
    program: {
      url: string;
      partners: number;
      commissions: number;
    } | null;
  }[];
  programs: {
    id: string;
    name: string;
    slug: string;
    status: string;
    totalClicks: number;
    totalLeads: number;
    totalConversions: number;
    totalSaleAmount: number;
    totalCommissions: number;
  }[];
  impersonateUrl: {
    app: string;
    partners: string;
  };
}

const programItems = [
  { id: "totalClicks", label: "Clicks" },
  { id: "totalLeads", label: "Leads" },
  { id: "totalConversions", label: "Conversions" },
  { id: "totalSaleAmount", label: "Sales", isCurrency: true },
  { id: "totalCommissions", label: "Commissions", isCurrency: true },
] as const;

export default function UserInfo({ data }: { data: UserInfoProps }) {
  return (
    <div className="grid gap-5">
      <LoginLinkCopyButton text={data.email} url={data.email} />
      <LoginLinkCopyButton
        text="app.dub.co login link"
        url={data.impersonateUrl.app}
      />
      <LoginLinkCopyButton
        text="partners.dub.co login link"
        url={data.impersonateUrl.partners}
      />

      {data.workspaces.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-neutral-900">
            Workspaces
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>
        </section>
      )}

      {data.programs.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-neutral-900">
            Partner programs
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function WorkspaceCard({
  workspace,
}: {
  workspace: UserInfoProps["workspaces"][number];
}) {
  const trialActive = isWorkspaceBillingTrialActive(workspace.trialEndsAt);
  const planLabel = workspace.planPeriod
    ? `${capitalize(workspace.plan)} (${workspace.planPeriod})`
    : capitalize(workspace.plan);
  const statsLabel =
    workspace.statsInterval === "30d" ? "Last 30 days" : "All-time";
  const programUrl = workspace.program
    ? getPrettyUrl(workspace.program.url)
    : null;

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="min-w-0">
          <a
            href={`${APP_DOMAIN}/${workspace.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 font-semibold text-neutral-900"
          >
            <span className="truncate">{workspace.name}</span>
            <ArrowUpRight2 className="size-3.5 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-700" />
          </a>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {workspace.slug}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="gray">{planLabel}</Badge>
          {trialActive && workspace.trialEndsAt && (
            <Badge variant="amber">
              Trial ends {formatDate(workspace.trialEndsAt, { month: "short" })}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-neutral-100 bg-neutral-100">
        <StatTile
          label="Events"
          value={nFormatter(workspace.events, { full: true })}
          hint={statsLabel}
        />
        <StatTile
          label="Links"
          value={nFormatter(workspace.links, { full: true })}
          hint={statsLabel}
        />
      </div>

      <MetaRow label="ID" value={workspace.id} copyValue={workspace.id} mono />

      {workspace.program && (
        <div className="space-y-0.5 border-t border-neutral-100 bg-neutral-50/80 py-1">
          <MetaRow
            label="Program URL"
            value={programUrl || "—"}
            href={
              workspace.program.url && isSafeLinkHref(workspace.program.url)
                ? workspace.program.url
                : undefined
            }
          />
          <MetaRow
            label="Partners"
            value={nFormatter(workspace.program.partners, { full: true })}
          />
          <MetaRow
            label="Commissions (30d)"
            value={currencyFormatter(workspace.program.commissions)}
          />
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program,
}: {
  program: UserInfoProps["programs"][number];
}) {
  const status = PartnerStatusBadges[program.status];

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">
            {program.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {program.slug}
          </p>
        </div>
        {status && (
          <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-neutral-100 bg-neutral-100">
        {programItems.slice(0, 2).map((item) => (
          <StatTile
            key={item.id}
            label={item.label}
            value={
              "isCurrency" in item && item.isCurrency
                ? currencyFormatter(program[item.id])
                : nFormatter(program[item.id], { full: true })
            }
          />
        ))}
      </div>

      <div className="py-1">
        <MetaRow label="ID" value={program.id} copyValue={program.id} mono />
        {programItems.slice(2).map((item) => (
          <MetaRow
            key={item.id}
            label={item.label}
            value={
              "isCurrency" in item && item.isCurrency
                ? currencyFormatter(program[item.id])
                : nFormatter(program[item.id], { full: true })
            }
          />
        ))}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white px-3.5 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-neutral-900">
        {value}
      </p>
      {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function MetaRow({
  label,
  value,
  copyValue,
  href,
  mono,
}: {
  label: string;
  value: string;
  copyValue?: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3.5 py-1.5">
      <span className="shrink-0 text-xs font-medium text-neutral-500">
        {label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-0.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
          >
            {value}
          </a>
        ) : (
          <span
            className={`truncate text-xs text-neutral-700 ${mono ? "font-mono" : ""}`}
          >
            {value}
          </span>
        )}
        {copyValue && <CopyButton value={copyValue} className="shrink-0" />}
      </span>
    </div>
  );
}

const LoginLinkCopyButton = ({ text, url }: { text: string; url: string }) => {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <div className="flex w-full items-center space-x-2">
      <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-900">
        {text}
      </div>
      <button
        type="button"
        onClick={() =>
          toast.promise(copyToClipboard(url), {
            success: "Copied to clipboard",
          })
        }
        className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
      >
        {copied ? <Tick className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};
