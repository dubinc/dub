import useWorkspace from "@/lib/swr/use-workspace";
import { GetDomainResponseSuccess } from "@dub/email/resend/types";
import { CircleCheck, CopyButton, StatusBadge, Table, useTable } from "@dub/ui";
import { capitalize, fetcher } from "@dub/utils";
import useSWRImmutable from "swr/immutable";
import { EMAIL_DOMAIN_STATUS_TO_VARIANT } from "./constants";

interface EmailDomainDnsRecordsProps {
  domain: string;
}

export function EmailDomainDnsRecords({ domain }: EmailDomainDnsRecordsProps) {
  const { id: workspaceId } = useWorkspace();

  const { data, isValidating, mutate } =
    useSWRImmutable<GetDomainResponseSuccess>(
      workspaceId &&
        `/api/email-domains/${domain}/verify?workspaceId=${workspaceId}`,
      fetcher,
      {
        onError: (error) => {
          console.error("Failed to fetch email domain verification", error);
        },
      },
    );

  const records = data?.records || [];
  const isVerified = records !== undefined && Object.keys(records).length === 0;

  const { table, ...tableProps } = useTable({
    data: records || [],
    columns: [
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
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
        cell: ({ row }) => (
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
        cell: ({ row }) => (
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
        cell: ({ row }) => (
          <span className="text-content-default text-sm">
            {row.original.ttl}
          </span>
        ),
        size: 80,
        minSize: 60,
        maxSize: 100,
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span className="text-content-default text-sm">
            {row.original.priority ?? "-"}
          </span>
        ),
        size: 80,
        minSize: 60,
        maxSize: 100,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
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
      },
    ],
    rowCount: records?.length || 0,
    getRowId: (row) => row.record,
    thClassName: "border-l-0",
    tdClassName: "border-l-0",
  });

  return (
    <div className="mt-4 space-y-4">
      {!records && !isValidating ? (
        <div className="h-20 animate-pulse rounded-lg bg-neutral-200" />
      ) : isVerified ? (
        <div className="flex items-center gap-2 text-pretty rounded-lg bg-green-100/80 p-3 text-sm text-green-600">
          <CircleCheck className="h-5 w-5 shrink-0" />
          <div>
            Good news! Your email domain is verified and ready to send emails.
          </div>
        </div>
      ) : records && records.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-100 p-4">
          <p className="text-sm text-neutral-700">
            To send emails from <strong>{domain}</strong> to your partners from
            Dub, ensure the DNS records below are setup.
          </p>

          <Table
            {...tableProps}
            table={table}
            containerClassName="border-0 bg-transparent"
            scrollWrapperClassName="min-h-0"
            emptyWrapperClassName="h-24"
            className="[&_tbody]:bg-transparent"
          />
        </div>
      ) : (
        <div className="rounded-lg bg-neutral-100/80 p-4 text-center text-sm text-neutral-600">
          Loading verification records...
        </div>
      )}
    </div>
  );
}
