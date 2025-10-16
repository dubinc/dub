import { CopyButton } from "@dub/ui";
import { cn } from "@dub/utils";
import { Fragment } from "react";

interface EmailDomainDnsRecordsProps {
  domain: string;
  workspaceSlug: string;
}

export function EmailDomainDnsRecords({
  domain,
  workspaceSlug,
}: EmailDomainDnsRecordsProps) {
  // Generate a dummy token for now
  const token = `${workspaceSlug}-${Math.random().toString(36).substring(2, 15)}`;
  
  const records = [
    {
      type: "TXT",
      name: "_dubemails",
      value: `vc-domain-verify=${workspaceSlug}, ${token}`,
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-neutral-700">
        To send emails from <strong>{domain}</strong> to your partners from Dub, ensure the records below are setup.
      </p>
      
      <div className="rounded-lg bg-neutral-100/80 p-4">
        <div className="grid grid-cols-[repeat(3,max-content)] items-end gap-x-10 gap-y-1 text-sm">
          {["Type", "Name", "Value"].map((header) => (
            <p key={header} className="font-medium text-neutral-950">
              {header}
            </p>
          ))}

          {records.map((record, idx) => (
            <Fragment key={idx}>
              <p className="font-mono">{record.type}</p>
              <p className="font-mono">{record.name}</p>
              <p className="flex items-end gap-1 font-mono">
                {record.value}{" "}
                <CopyButton
                  variant="neutral"
                  className="-mb-0.5"
                  value={record.value}
                />
              </p>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
