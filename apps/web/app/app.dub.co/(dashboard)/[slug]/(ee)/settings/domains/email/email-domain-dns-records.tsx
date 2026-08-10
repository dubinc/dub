"use client";

import { isAllowedSyncUXOrigin } from "@/lib/domain-connect/constants";
import type { DomainConnectDiscovery } from "@/lib/domain-connect/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { useForwardDnsInstructionsModal } from "@/ui/modals/forward-dns-instructions-modal";
import { GetDomainResponseSuccess } from "@dub/email/resend/types";
import {
  Button,
  CircleCheck,
  Cloudflare,
  CopyButton,
  StatusBadge,
  Table,
  useTable,
  Vercel,
} from "@dub/ui";
import { EnvelopeArrowRight } from "@dub/ui/icons";
import { capitalize, cn, fetcher } from "@dub/utils";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { EMAIL_DOMAIN_STATUS_TO_VARIANT } from "./constants";

interface EmailDomainDnsRecordsProps {
  domain: EmailDomainProps;
}

type EmailDomainVerifyResponse = GetDomainResponseSuccess & {
  domainConnect?: DomainConnectDiscovery | null;
};

interface DomainRecord {
  record: string;
  type: string;
  name: string;
  value: string;
  ttl: string;
  priority?: number | null;
  status?:
    | "not_started"
    | "verified"
    | "pending"
    | "failed"
    | "temporary_failure";
}

interface DnsRecordsTableProps {
  title: string;
  description: React.ReactNode;
  records: DomainRecord[];
  showPriority?: boolean;
  showStatus?: boolean;
}

function DnsRecordsTable({
  title,
  description,
  records,
  showPriority = false,
  showStatus = false,
}: DnsRecordsTableProps) {
  const columns = [
    {
      id: "type",
      header: "Type",
      cell: ({ row }: { row: { original: DomainRecord } }) => (
        <span className="text-content-default font-mono text-sm">
          {row.original.type}
        </span>
      ),
      size: 80,
      minSize: 80,
      maxSize: 100,
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }: { row: { original: DomainRecord } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="text-content-default truncate text-sm"
            title={row.original.name}
          >
            {row.original.name}
          </span>
          <CopyButton
            variant="neutral"
            className="flex-shrink-0"
            value={row.original.name}
          />
        </div>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
    },
    {
      id: "value",
      header: "Value",
      cell: ({ row }: { row: { original: DomainRecord } }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="text-content-default truncate text-sm"
            title={row.original.value}
          >
            {row.original.value}
          </span>
          <CopyButton
            variant="neutral"
            className="flex-shrink-0"
            value={row.original.value}
          />
        </div>
      ),
      size: 300,
      minSize: 200,
      maxSize: 500,
    },
    {
      id: "ttl",
      header: "TTL",
      cell: ({ row }: { row: { original: DomainRecord } }) => (
        <span className="text-content-default text-sm">{row.original.ttl}</span>
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
    },
  ];

  if (showPriority) {
    columns.push({
      id: "priority",
      header: "Priority",
      cell: ({ row }: { row: { original: DomainRecord } }) => (
        <span className="text-content-default text-sm">
          {row.original.priority ?? "-"}
        </span>
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
    });
  }

  if (showStatus) {
    columns.push({
      id: "status",
      header: "Status",
      cell: ({ row }: { row: { original: DomainRecord } }) => {
        const status = row.original.status!;
        const variant = EMAIL_DOMAIN_STATUS_TO_VARIANT[status];

        return (
          <StatusBadge variant={variant} icon={null}>
            {capitalize(status.replace(/_/g, " "))}
          </StatusBadge>
        );
      },
      size: 120,
      minSize: 100,
      maxSize: 150,
    });
  }

  const { table, ...tableProps } = useTable({
    data: records,
    columns,
    getRowId: (row: DomainRecord) => `${row.type}-${row.name}`,
    thClassName: "border-l-0 py-1.5",
    tdClassName: "border-l-0 py-1.5",
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      {description}
      <Table
        {...tableProps}
        table={table}
        containerClassName="border-0 bg-transparent rounded-none"
        scrollWrapperClassName="min-h-0"
        emptyWrapperClassName="h-24"
        className="[&_tbody]:bg-transparent"
      />
    </div>
  );
}

// Hide until Domain Connect + forward-instructions email template are ready to ship for email domains.
const ENABLE_EMAIL_DNS_ACTIONS = false;

export function EmailDomainDnsRecords({ domain }: EmailDomainDnsRecordsProps) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const pathname = usePathname();
  const [autoLoading, setAutoLoading] = useState(false);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<EmailDomainVerifyResponse>(
      workspaceId &&
        `/api/email-domains/${domain.slug}/verify?workspaceId=${workspaceId}`,
      fetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        onError: (err) => {
          console.error("Failed to fetch email domain verification", err);
        },
      },
    );

  const domainConnect = data?.domainConnect ?? null;
  const isVerified = data?.status === "verified";
  const records = data?.records;

  const { ForwardDnsInstructionsModal, setShowForwardDnsModal } =
    useForwardDnsInstructionsModal({
      domain: domain.slug,
      workspaceId: workspaceId ?? "",
      endpoint: workspaceId
        ? `/api/email-domains/${encodeURIComponent(domain.slug)}/forward-instructions?workspaceId=${workspaceId}`
        : "",
    });

  const providerLabel =
    domainConnect?.providerKind === "cloudflare" ? "Cloudflare" : "Vercel";
  const ProviderIcon =
    domainConnect?.providerKind === "cloudflare" ? Cloudflare : Vercel;

  const handleAutoConfigure = async () => {
    if (!workspaceId) return;
    setAutoLoading(true);
    try {
      const res = await fetch(
        `/api/email-domains/${encodeURIComponent(domain.slug)}/domain-connect/apply?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnTo: pathname ?? `/${workspaceSlug}/settings/domains/email`,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not start auto configure.");
        return;
      }
      if (json?.applyUrl) {
        if (!isAllowedSyncUXOrigin(json.applyUrl as string)) {
          toast.error("Invalid redirect URL from server.");
          return;
        }
        window.location.assign(json.applyUrl as string);
        return;
      }
      toast.error("Could not start auto configure.");
    } catch {
      toast.error("Could not start auto configure.");
    } finally {
      setAutoLoading(false);
    }
  };

  const dmarcRecords = [
    {
      record: "dmarc",
      type: "TXT",
      name: "_dmarc",
      value: "v=DMARC1; p=none;",
      ttl: "Auto",
    },
  ];

  if (error && !data) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-neutral-100/80 p-4 text-center">
        <p className="text-sm text-neutral-600">
          Failed to load verification records. Please try again.
        </p>
        <Button
          type="button"
          variant="secondary"
          text="Retry"
          className="w-fit"
          loading={isValidating}
          onClick={() => mutate()}
        />
      </div>
    );
  }

  if (!data || isLoading) {
    return (
      <div className="mt-4">
        <div className="h-20 animate-pulse rounded-lg bg-neutral-200" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {isVerified ? (
        <div className="flex items-center gap-2 text-pretty rounded-lg bg-green-100/80 p-3 text-sm text-green-600">
          <CircleCheck className="h-5 w-5 shrink-0" />
          <div>
            Good news! All the DNS records are verified. You are ready to start
            sending emails with this domain.
          </div>
        </div>
      ) : records && records.length > 0 ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-100 p-4">
            <div className="flex flex-col gap-6">
              <DnsRecordsTable
                title="DKIM and SPF (Required)"
                description={
                  <p className="text-sm text-neutral-700">
                    To authorize Dub to send emails from{" "}
                    <strong>{domain.slug}</strong> to your partners, verify that
                    the DNS records listed below are properly configured in your
                    domain's DNS settings.
                  </p>
                }
                records={records}
                showPriority
                showStatus
              />
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-100 p-4">
            <DnsRecordsTable
              title="DMARC (Recommended)"
              description={
                <p className="text-sm text-neutral-700">
                  Add DMARC record to build trust in your domain and protect
                  against email spoofing.
                </p>
              }
              records={dmarcRecords}
            />
          </div>

          {ENABLE_EMAIL_DNS_ACTIONS && (domainConnect || workspaceId) && (
            <div className="flex flex-wrap gap-2">
              {domainConnect && workspaceId && (
                <Button
                  type="button"
                  variant="secondary"
                  text={`Auto configure with ${providerLabel}`}
                  icon={
                    <ProviderIcon
                      className={cn(
                        "size-4 shrink-0",
                        domainConnect.providerKind === "cloudflare"
                          ? "text-[#F6821F]"
                          : "text-black",
                      )}
                    />
                  }
                  className="w-fit"
                  onClick={handleAutoConfigure}
                  loading={autoLoading}
                />
              )}
              {workspaceId && (
                <Button
                  type="button"
                  variant="secondary"
                  text="Forward instructions"
                  icon={<EnvelopeArrowRight className="size-4 shrink-0" />}
                  className="w-fit"
                  onClick={() => setShowForwardDnsModal(true)}
                />
              )}
            </div>
          )}
          {ENABLE_EMAIL_DNS_ACTIONS && <ForwardDnsInstructionsModal />}
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-100/80 p-4 text-center text-sm text-neutral-600">
          No verification records available for this domain yet.
        </div>
      )}
    </div>
  );
}
