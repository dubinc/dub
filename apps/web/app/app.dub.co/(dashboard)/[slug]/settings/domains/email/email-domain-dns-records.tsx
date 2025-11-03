import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { GetDomainResponseSuccess } from "@dub/email/resend/types";
import { CircleCheck, CopyButton, StatusBadge, Table, useTable } from "@dub/ui";
import { capitalize, fetcher } from "@dub/utils";
import useSWRImmutable from "swr/immutable";
import { EMAIL_DOMAIN_STATUS_TO_VARIANT } from "./constants";

interface EmailDomainDnsRecordsProps {
  domain: EmailDomainProps;
}

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

export function EmailDomainDnsRecords({ domain }: EmailDomainDnsRecordsProps) {
  const { id: workspaceId } = useWorkspace();

  const { data, isValidating } = useSWRImmutable<GetDomainResponseSuccess>(
    workspaceId &&
      `/api/email-domains/${domain.slug}/verify?workspaceId=${workspaceId}`,
    fetcher,
    {
      onError: (error) => {
        console.error("Failed to fetch email domain verification", error);
      },
    },
  );

  const isVerified = data?.status === "verified";
  const records = data?.records || [];

  const dmarcRecords = [
    {
      record: "dmarc",
      type: "TXT",
      name: "_dmarc",
      value: "v=DMARC1; p=none;",
      ttl: "Auto",
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      {!records && !isValidating ? (
        <div className="h-20 animate-pulse rounded-lg bg-neutral-200" />
      ) : isVerified ? (
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
              {records.length > 0 && (
                <DnsRecordsTable
                  title="DKIM and SPF (Required)"
                  description={
                    <p className="text-sm text-neutral-700">
                      To authorize Dub to send emails from{" "}
                      <strong>{domain.slug}</strong> to your partners, verify
                      that the DNS records listed below are properly configured
                      in your domain's DNS settings.
                    </p>
                  }
                  records={records}
                  showPriority
                  showStatus
                />
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-neutral-200 bg-neutral-100 p-4">
            {dmarcRecords.length > 0 && (
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
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-100/80 p-4 text-center text-sm text-neutral-600">
          Loading verification records...
        </div>
      )}
    </div>
  );
}
