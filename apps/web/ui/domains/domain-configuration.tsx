import { DomainVerificationStatusProps } from "@/lib/types";
import { CircleInfo, CopyButton, TabSelect } from "@dub/ui";
import { cn, getSubdomain } from "@dub/utils";
import { Fragment, useState } from "react";

export default function DomainConfiguration({
  data,
}: {
  data: { status: DomainVerificationStatusProps; response: any };
}) {
  const { domainJson, configJson } = data.response;
  const subdomain = getSubdomain(domainJson.name, domainJson.apexName);
  const [recordType, setRecordType] = useState(!!subdomain ? "CNAME" : "A");

  if (data.status === "Pending Verification") {
    const txtVerification = domainJson.verification.find(
      (x: any) => x.type === "TXT",
    );
    return (
      <div className="border-t border-gray-200">
        <DnsRecord
          instructions={`Please set the following TXT record on <code>${domainJson.apexName}</code> to prove ownership of <code>${domainJson.name}</code>:`}
          records={[
            {
              type: txtVerification.type,
              name: txtVerification.domain.slice(
                0,
                txtVerification.domain.length - domainJson.apexName.length - 1,
              ),
              value: txtVerification.value,
            },
          ]}
          warning="Warning: if you are using this domain for another site, setting this TXT record will transfer domain ownership away from that site and break it. Please exercise caution when setting this record; make sure that the domain that is shown in the TXT verification value is actually the <b><i>domain you want to use on Dub.co</i></b> – <b><i>not your production site</i></b>."
        />
      </div>
    );
  }

  if (data.status === "Conflicting DNS Records") {
    return (
      <div className="border-t border-gray-200 pt-5">
        <div className="flex justify-start space-x-4">
          <div className="ease border-b-2 border-black pb-1 text-sm text-black transition-all duration-150">
            {configJson?.conflicts.some((x) => x.type === "A")
              ? "A Record (recommended)"
              : "CNAME Record (recommended)"}
          </div>
        </div>
        <DnsRecord
          instructions="Please remove the following conflicting DNS records from your DNS provider:"
          records={configJson?.conflicts.map(
            ({
              name,
              type,
              value,
            }: {
              name: string;
              type: string;
              value: string;
            }) => ({
              name,
              type,
              value,
            }),
          )}
        />
        <DnsRecord
          instructions="Afterwards, set the following record on your DNS provider:"
          records={[
            {
              type: recordType,
              name: recordType === "A" ? "@" : subdomain ?? "www",
              value: recordType === "A" ? `76.76.21.21` : `cname.dub.co`,
              ttl: "86400",
            },
          ]}
        />
      </div>
    );
  }

  if (data.status === "Unknown Error") {
    return (
      <div className="border-t border-gray-200 pt-5">
        <p className="mb-5 text-sm">{data.response.domainJson.error.message}</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="-ml-1.5 border-b border-gray-200">
        <TabSelect
          options={[
            { id: "A", label: `A Record${!subdomain ? " (recommended)" : ""}` },
            {
              id: "CNAME",
              label: `CNAME Record${subdomain ? " (recommended)" : ""}`,
            },
          ]}
          selected={recordType}
          onSelect={setRecordType}
        />
      </div>

      <DnsRecord
        instructions={`To configure your ${
          recordType === "A" ? "apex domain" : "subdomain"
        } <code>${
          recordType === "A" ? domainJson.apexName : domainJson.name
        }</code>, set the following ${recordType} record on your DNS provider:`}
        records={[
          {
            type: recordType,
            name: recordType === "A" ? "@" : subdomain ?? "www",
            value: recordType === "A" ? `76.76.21.21` : `cname.dub.co`,
            ttl: "86400",
          },
        ]}
      />
    </div>
  );
}

const MarkdownText = ({ text }: { text: string }) => {
  return (
    <p
      className="prose-sm prose-code:rounded-md prose-code:bg-gray-100 prose-code:p-1 prose-code:text-[.8125rem] prose-code:font-medium prose-code:font-mono prose-code:text-gray-900 max-w-none"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

const DnsRecord = ({
  instructions,
  records,
  warning,
}: {
  instructions: string;
  records: { type: string; name: string; value: string; ttl?: string }[];
  warning?: string;
}) => {
  const hasTtl = records.some((x) => x.ttl);

  return (
    <div className="mt-3 text-left text-gray-600">
      <div className="my-5">
        <MarkdownText text={instructions} />
      </div>
      <div
        className={cn(
          "grid items-end gap-x-10 gap-y-1 rounded-lg bg-gray-100/80 p-4 text-sm",
          hasTtl
            ? "grid-cols-[repeat(4,min-content)]"
            : "grid-cols-[repeat(3,min-content)]",
        )}
      >
        {["Type", "Name", "Value", "TTL"].map((s) => (
          <p key={s} className="font-medium text-gray-950">
            {s}
          </p>
        ))}

        {records.map((record, idx) => (
          <Fragment key={idx}>
            <p key={record.type} className="font-mono">
              {record.type}
            </p>
            <p key={record.name} className="font-mono">
              {record.name}
            </p>
            <p key={record.value} className="flex items-end gap-1 font-mono">
              {record.value}{" "}
              <CopyButton
                variant="neutral"
                className="-mb-0.5"
                value={record.value}
              />
            </p>
            {hasTtl && (
              <p key={record.ttl} className="font-mono">
                {record.ttl}
              </p>
            )}
          </Fragment>
        ))}
      </div>
      {(warning || hasTtl) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-indigo-600">
          <CircleInfo className="h-5 w-5 shrink-0" />
          <MarkdownText
            text={
              warning ||
              "If a TTL value of 86400 is not available, choose the highest available value. Domain propagation may take up to 12 hours."
            }
          />
        </div>
      )}
    </div>
  );
};
