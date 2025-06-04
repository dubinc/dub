"use client";
import { Badge, Copy, Tick, useCopyToClipboard } from "@dub/ui";
import { capitalize, nFormatter } from "@dub/utils";
import { toast } from "sonner";

export interface UserInfoProps {
  email: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    clicks: number;
    links: number;
    totalClicks: number;
    totalLinks: number;
  }[];
  impersonateUrl: {
    app: string;
    partners: string;
  };
}

const items = [
  { id: "clicks", label: "Clicks" },
  { id: "links", label: "Links" },
  { id: "totalClicks", label: "Total Clicks" },
  { id: "totalLinks", label: "Total Links" },
];

export default function UserInfo({ data }: { data: UserInfoProps }) {
  return (
    <div className="grid gap-2">
      <LoginLinkCopyButton text={data.email} url={data.email} />
      <LoginLinkCopyButton
        text="app.dub.co login link"
        url={data.impersonateUrl.app}
      />
      <LoginLinkCopyButton
        text="partners.dub.co login link"
        url={data.impersonateUrl.partners}
      />
      <div className="grid grid-cols-2 gap-4">
        {data.workspaces.map((workspace) => (
          <div
            key={workspace.slug}
            className="flex flex-col space-y-2 rounded-lg border border-neutral-200 p-2"
          >
            <div className="flex items-center space-x-2">
              <p className="font-semibold">{workspace.name}</p>
              <Badge className="lowercase">{workspace.slug}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-neutral-700">ID</span>
              <span className="text-neutral-500">{workspace.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-neutral-700">Plan</span>
              <span className="text-neutral-500">
                {capitalize(workspace.plan)}
              </span>
            </div>
            {items.map((item) => (
              <div className="flex justify-between text-sm">
                <span className="font-medium text-neutral-700">
                  {item.label}
                </span>
                <span className="text-neutral-500">
                  {nFormatter(workspace[item.id], { full: true })}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const LoginLinkCopyButton = ({ text, url }: { text: string; url: string }) => {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <div className="flex w-full items-center space-x-3">
      <div className="w-full rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-900">
        {text}
      </div>
      <button
        type="button"
        onClick={() =>
          toast.promise(copyToClipboard(url), {
            success: "Copied to clipboard",
          })
        }
        className="rounded-md border border-neutral-300 p-2"
      >
        {copied ? (
          <Tick className="h-5 w-5 text-neutral-500" />
        ) : (
          <Copy className="h-5 w-5 text-neutral-500" />
        )}
      </button>
    </div>
  );
};
