"use client";

import { CopyButton } from "@dub/ui";

export default function OAuthAppCredentials({
  clientId,
  clientSecret,
  partialClientSecret,
}: {
  clientId: string;
  clientSecret: string | null;
  partialClientSecret: string;
}) {
  if (!clientId) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-3 text-left">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-500">
          Client ID
        </label>
        <div className="grid grid-cols-[1fr,auto] items-center gap-2 rounded-md border border-neutral-300 bg-white p-3">
          <p className="truncate font-mono text-sm text-neutral-500">
            {clientId}
          </p>
          <CopyButton value={clientId} className="rounded-md" />
        </div>
      </div>

      {clientSecret && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-500">
            Client Secret
          </label>
          <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white p-3">
            <p className="text-nowrap font-mono text-sm text-neutral-500">
              {clientSecret}
            </p>
            <div className="flex flex-col gap-2">
              <CopyButton value={clientSecret} className="rounded-md" />
            </div>
          </div>
          <span className="text-xs text-red-400">
            Be sure to copy your client secret. You won’t be able to see it
            again.
          </span>
        </div>
      )}

      {!clientSecret && partialClientSecret && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-500">
            Client Secret
          </label>
          <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white p-3">
            <p className="text-nowrap font-mono text-sm text-neutral-500">
              {partialClientSecret}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
