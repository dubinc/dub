import { DomainVerificationStatusProps } from "@/lib/types";
import { useState } from "react";

const InlineSnippet = ({ children }: { children: string }) => {
  return (
    <span className="font-mono text-blue-900 bg-blue-100 p-1 rounded-md inline-block">
      {children}
    </span>
  );
};

export default function DomainConfiguration({
  data,
}: {
  data: { status: DomainVerificationStatusProps; response: any };
}) {
  const [recordType, setRecordType] = useState("A");
  const { domainJson } = data.response;

  if (data.status === "Pending Verification") {
    const txtVerification = domainJson.verification.find(
      (x: any) => x.type === "TXT"
    );
    return (
      <div className="border-t border-gray-200 pt-5">
        <p className="mb-5 text-sm">
          Please set the following TXT record on{" "}
          <InlineSnippet>{domainJson.apexName}</InlineSnippet> to prove
          ownership of <InlineSnippet>{domainJson.name}</InlineSnippet>:
        </p>
        <div className="flex justify-start items-start space-x-10 bg-gray-50 p-2 rounded-md">
          <div>
            <p className="text-sm font-bold">Type</p>
            <p className="text-sm font-mono mt-2">{txtVerification.type}</p>
          </div>
          <div>
            <p className="text-sm font-bold">Name</p>
            <p className="text-sm font-mono mt-2">
              {txtVerification.domain.slice(
                0,
                txtVerification.domain.length - domainJson.apexName.length - 1
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">Value</p>
            <p className="text-sm font-mono mt-2">
              <span className="text-ellipsis">{txtVerification.value}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-5">
      <div className="flex justify-start space-x-4">
        <button
          onClick={() => setRecordType("A")}
          className={`${
            recordType == "A"
              ? "text-black border-black"
              : "text-gray-400 border-white"
          } text-sm border-b-2 pb-1 transition-all ease duration-150`}
        >
          A Record (recommended)
        </button>
        <button
          onClick={() => setRecordType("CNAME")}
          className={`${
            recordType == "CNAME"
              ? "text-black border-black"
              : "text-gray-400 border-white"
          } text-sm border-b-2 pb-1 transition-all ease duration-150`}
        >
          CNAME Record (for subdomains)
        </button>
      </div>
      <div className="my-3 text-left">
        <p className="my-5 text-sm">
          To configure your {recordType === "A" ? "apex domain" : "subdomain"} (
          <InlineSnippet>
            {recordType === "A" ? domainJson.apexName : domainJson.name}
          </InlineSnippet>
          ), set the following {recordType} record on your DNS provider to
          continue:
        </p>
        <div className="flex justify-start items-center space-x-10 bg-gray-50 p-2 rounded-md">
          <div>
            <p className="text-sm font-bold">Type</p>
            <p className="text-sm font-mono mt-2">{recordType}</p>
          </div>
          <div>
            <p className="text-sm font-bold">Name</p>
            <p className="text-sm font-mono mt-2">
              {recordType === "A" ? "@" : "www"}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">Value</p>
            <p className="text-sm font-mono mt-2">
              {recordType === "A" ? `76.76.21.21` : `cname.dub.sh`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
