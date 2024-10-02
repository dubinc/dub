"use client";

import { Badge, Copy, Globe2, Tick } from "@dub/ui";
import { capitalize, nFormatter } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";

export interface UserInfoProps {
  email: string;
  defaultDomainLinks: Record<string, number>;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    clicks: number;
    domains: number;
    links: number;
  }[];
  impersonateUrl: string;
}

export default function UserInfo({ data }: { data: UserInfoProps }) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className="flex w-full items-center space-x-3">
        <input
          type="email"
          name="email"
          id="email"
          value={data.email}
          readOnly
          className="w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
        />
        <button
          type="button"
          onClick={() => {
            setCopied(true);
            navigator.clipboard.writeText(data.impersonateUrl);
            toast.success("Copied to clipboard");
            setTimeout(() => {
              setCopied(false);
            }, 3000);
          }}
          className="rounded-md border border-gray-300 p-2"
        >
          {copied ? (
            <Tick className="h-5 w-5 text-gray-500" />
          ) : (
            <Copy className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
      {Object.keys(data.defaultDomainLinks).length > 0 && (
        <div className="mt-2 grid divide-y divide-gray-200">
          {Object.entries(data.defaultDomainLinks).map(([domain, count]) => (
            <div key={domain} className="flex justify-between py-2">
              <div className="flex items-center space-x-2">
                <Globe2 className="h-4 w-4" />
                <span className="font-semibold text-gray-700">{domain}</span>
              </div>
              <span className="text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-4">
        {data.workspaces.map((workspace) => (
          <div
            key={workspace.slug}
            className="flex flex-col space-y-2 rounded-lg border border-gray-200 p-2"
          >
            <div className="flex items-center space-x-2">
              <p className="font-semibold">{workspace.name}</p>
              <Badge className="lowercase">{workspace.slug}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">ID</span>
              <span className="text-gray-500">{workspace.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Plan</span>
              <span className="text-gray-500">
                {capitalize(workspace.plan)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Domains</span>
              <span className="text-gray-500">{workspace.domains}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Links</span>
              <span className="text-gray-500">
                {nFormatter(workspace.links, { full: true })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Clicks</span>
              <span className="text-gray-500">
                {nFormatter(workspace.clicks, { full: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
