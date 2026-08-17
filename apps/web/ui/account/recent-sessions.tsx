"use client";

import {
  parseSessionDisplay,
  type SessionDeviceType,
} from "@/lib/auth/parse-session-display";
import { authClient } from "@/lib/better-auth/auth-client";
import { userSessionSchema } from "@/lib/zod/schemas/auth";
import { Button, StatusBadge } from "@dub/ui";
import { Desktop, MobilePhone, Tablet } from "@dub/ui/icons";
import { fetcher, timeAgo } from "@dub/utils";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { z } from "zod";

type UserSessionProps = z.infer<typeof userSessionSchema>;

const DEVICE_ICONS: Record<
  SessionDeviceType,
  ComponentType<{ className?: string }>
> = {
  desktop: Desktop,
  mobile: MobilePhone,
  tablet: Tablet,
};

function isStaleSessionError(error?: { code?: string } | null) {
  return (
    error?.code === "SESSION_NOT_FRESH" || error?.code === "SESSION_EXPIRED"
  );
}

export function RecentSessions() {
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const {
    data: sessions,
    isLoading,
    error,
    mutate,
  } = useSWR<UserSessionProps[]>("/api/user/sessions", fetcher);

  async function revoke(token: string) {
    setRevokingToken(token);

    try {
      const { error: revokeError } = await authClient.revokeSession({ token });

      if (revokeError) {
        toast.error(
          isStaleSessionError(revokeError)
            ? "Sign in again to manage sessions"
            : revokeError.message || "Failed to remove session.",
        );
        return;
      }

      toast.success("Session removed.");
      await mutate();
    } catch {
      toast.error("Failed to remove session.");
    } finally {
      setRevokingToken(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col space-y-1 border-b border-neutral-200 p-6">
          <div className="h-5 w-40 rounded-full bg-neutral-100" />
          <div className="h-3 w-72 rounded-full bg-neutral-100" />
        </div>
        <div className="divide-y divide-neutral-200">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex justify-between gap-4 px-6 py-4">
              <div className="h-4 w-48 rounded-full bg-neutral-100" />
              <div className="h-8 w-16 rounded-md bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col space-y-1 border-b border-neutral-200 p-6">
        <h2 className="text-base font-semibold">Recent Sessions</h2>
        <p className="text-sm text-neutral-500">
          Manage and logout your active sessions or other browsers and devices
        </p>
      </div>

      {error ? (
        <p className="px-6 py-4 text-sm text-neutral-500">
          {error.message || "Failed to load sessions."}
        </p>
      ) : (
        <div className="divide-y divide-neutral-200">
          {sessions?.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              revoking={revokingToken === session.token}
              onRevoke={() => {
                if (session.token) {
                  revoke(session.token);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  revoking,
  onRevoke,
}: {
  session: UserSessionProps;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const { device, deviceType, ipAddress } = parseSessionDisplay({
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
  });

  const Icon = DEVICE_ICONS[deviceType];

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-neutral-700">
          <Icon className="size-5 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">
            {device}
            {ipAddress ? ` · ${ipAddress}` : ""}
          </p>
          <p className="text-sm text-neutral-500" suppressHydrationWarning>
            {timeAgo(new Date(session.createdAt), { withAgo: true })}
          </p>
        </div>
      </div>

      {session.isCurrent ? (
        <StatusBadge variant="neutral" size="sm" icon={null}>
          Current
        </StatusBadge>
      ) : (
        <Button
          text="Revoke"
          variant="danger"
          className="h-8 w-fit px-3"
          loading={revoking}
          onClick={onRevoke}
        />
      )}
    </div>
  );
}
