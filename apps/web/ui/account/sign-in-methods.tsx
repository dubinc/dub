"use client";

import { SSO_LOGIN_PROGRAMS } from "@/lib/auth/sso-login-programs";
import {
  getAuthProviderLabel,
  getOAuthErrorCallbackURL,
} from "@/lib/better-auth/account-linking";
import { authClient } from "@/lib/better-auth/auth-client";
import { getAuthError } from "@/lib/better-auth/auth-errors";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import useUser from "@/lib/swr/use-user";
import {
  Beehiiv,
  Button,
  Github,
  Google,
  Popover,
  useCurrentSubdomain,
} from "@dub/ui";
import { Key } from "@dub/ui/icons";
import { cn, timeAgo } from "@dub/utils";
import { Framer, MoreVertical } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type ListedAccount = NonNullable<
  Awaited<ReturnType<typeof authClient.listAccounts>>["data"]
>[number];

const SECURITY_CALLBACK_PATH = "/account/settings/security";

const SOCIAL_METHODS = [
  { providerId: "google" as const, icon: Google },
  { providerId: "github" as const, icon: Github },
];

const PROGRAM_ICONS = {
  framer: Framer,
  beehiiv: Beehiiv,
} as const;

async function fetchAccounts() {
  const { data, error } = await authClient.listAccounts();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function SignInMethods({
  onManagePassword,
}: {
  onManagePassword: () => void;
}) {
  const { user } = useUser();
  const { subdomain } = useCurrentSubdomain();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState(false);

  const {
    data: accounts,
    isLoading: accountsLoading,
    mutate,
  } = useSWR<ListedAccount[]>("auth-list-accounts", fetchAccounts);

  const isPartners = subdomain === "partners";
  const hostReady = subdomain !== null;

  const { programEnrollments, isLoading: enrollmentsLoading } =
    useProgramEnrollments({ status: "approved" }, { enabled: isPartners });

  useEffect(() => {
    const message = getAuthError({
      error: new URLSearchParams(window.location.search).get("error"),
    });

    if (message) {
      toast.error(message);
    }
  }, []);

  const enrolledSlugs = useMemo(
    () => new Set(programEnrollments?.map(({ program }) => program.slug) ?? []),
    [programEnrollments],
  );

  const programMethods = useMemo(() => {
    if (!isPartners) {
      return [];
    }

    return SSO_LOGIN_PROGRAMS.filter(
      ({ slug }) =>
        enrolledSlugs.has(slug) ||
        accounts?.some((account) => account.providerId === slug),
    );
  }, [accounts, enrolledSlugs, isPartners]);

  const credentialAccount = accounts?.find(
    (account) => account.providerId === "credential",
  );
  const hasPassword = user?.hasPassword || !!credentialAccount;

  const unlinkableCount =
    (accounts?.filter((account) => account.providerId !== "credential")
      .length ?? 0) + (hasPassword ? 1 : 0);

  const connectSocial = async (provider: "google" | "github") => {
    setLinkingProvider(provider);

    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: SECURITY_CALLBACK_PATH,
      errorCallbackURL: getOAuthErrorCallbackURL(provider),
    });

    if (error) {
      toast.error(
        error.message || `Failed to connect ${getAuthProviderLabel(provider)}.`,
      );
      setLinkingProvider(null);
    }
  };

  const connectProgram = async (providerId: string) => {
    setLinkingProvider(providerId);

    const { error } = await authClient.oauth2.link({
      providerId,
      callbackURL: SECURITY_CALLBACK_PATH,
      errorCallbackURL: getOAuthErrorCallbackURL(providerId),
    });

    if (error) {
      toast.error(
        error.message ||
          `Failed to connect ${getAuthProviderLabel(providerId)}.`,
      );
      setLinkingProvider(null);
    }
  };

  const disconnect = async (providerId: string) => {
    const { error } = await authClient.unlinkAccount({
      providerId,
    });

    if (error) {
      toast.error(
        error.code === "SESSION_NOT_FRESH" || error.code === "SESSION_EXPIRED"
          ? "Sign in again to disconnect this method."
          : error.message ||
              "Failed to disconnect. Sign in again if your session is no longer fresh.",
      );
      return;
    }

    toast.success(`${getAuthProviderLabel(providerId)} disconnected.`);
    await mutate();
  };

  const setPassword = async () => {
    if (!user?.email) {
      return;
    }

    try {
      setSettingPassword(true);

      const { error } = await authClient.requestPasswordReset({
        email: user.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message || "Failed to send password set email.");
      }

      toast.success(
        `We've sent you an email to ${user.email} with instructions to set your password`,
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSettingPassword(false);
    }
  };

  const loading =
    !hostReady || accountsLoading || (isPartners && enrollmentsLoading);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col space-y-1 border-b border-neutral-200 p-6">
          <div className="h-5 w-40 rounded-full bg-neutral-100" />
          <div className="h-3 w-72 rounded-full bg-neutral-100" />
        </div>
        <div className="divide-y divide-neutral-200">
          {Array.from({ length: 3 }).map((_, index) => (
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
        <h2 className="text-base font-semibold">Sign-in Methods</h2>
        <p className="text-sm text-neutral-500">
          Customize how you access your account. Link Google or GitHub and set a
          password for seamless, secure authentication.
        </p>
      </div>

      <div className="divide-y divide-neutral-200">
        {SOCIAL_METHODS.map(({ providerId, icon: Icon }) => {
          const account = accounts?.find(
            (item) => item.providerId === providerId,
          );

          return (
            <SignInMethodRow
              key={providerId}
              icon={<Icon className="size-5" />}
              label={getAuthProviderLabel(providerId)}
              identifier={account ? user?.email : undefined}
              lastUsed={account?.updatedAt}
              connected={!!account}
              loading={linkingProvider === providerId}
              canDisconnect={unlinkableCount > 1}
              onAdd={() => connectSocial(providerId)}
              onDisconnect={() => disconnect(providerId)}
            />
          );
        })}

        {programMethods.map((program) => {
          const Icon =
            PROGRAM_ICONS[program.slug as keyof typeof PROGRAM_ICONS];
          const account = accounts?.find(
            (item) => item.providerId === program.slug,
          );

          return (
            <SignInMethodRow
              key={program.slug}
              icon={Icon ? <Icon className="size-5" /> : null}
              label={program.name}
              identifier={account ? user?.email : undefined}
              lastUsed={account?.updatedAt}
              connected={!!account}
              loading={linkingProvider === program.slug}
              canDisconnect={unlinkableCount > 1}
              onAdd={() => connectProgram(program.slug)}
              onDisconnect={() => disconnect(program.slug)}
            />
          );
        })}

        <SignInMethodRow
          icon={<Key className="size-5" />}
          label="Password"
          connected={hasPassword}
          loading={settingPassword}
          addLabel="Set password"
          manageLabel="Manage"
          onAdd={setPassword}
          onManage={onManagePassword}
        />
      </div>
    </div>
  );
}

function SignInMethodRow({
  icon,
  label,
  identifier,
  lastUsed,
  connected,
  loading,
  canDisconnect,
  addLabel = "Add",
  manageLabel,
  onAdd,
  onManage,
  onDisconnect,
}: {
  icon: ReactNode;
  label: string;
  identifier?: string | null;
  lastUsed?: Date | string;
  connected: boolean;
  loading?: boolean;
  canDisconnect?: boolean;
  addLabel?: string;
  manageLabel?: string;
  onAdd: () => void;
  onManage?: () => void;
  onDisconnect?: () => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  const lastUsedDate = lastUsed ? new Date(lastUsed) : null;

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-neutral-700">{icon}</div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-neutral-900">{label}</span>
          {identifier && (
            <span className="truncate text-sm text-neutral-500">
              {identifier}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {connected && lastUsedDate && (
          <span
            className="hidden text-sm text-neutral-500 sm:inline"
            suppressHydrationWarning
          >
            Last used {timeAgo(lastUsedDate)}
          </span>
        )}

        {!connected ? (
          <Button
            text={addLabel}
            onClick={onAdd}
            loading={loading}
            className="h-8 w-fit px-3"
          />
        ) : onManage ? (
          <Button
            text={manageLabel ?? "Manage"}
            variant="secondary"
            onClick={onManage}
            className="h-8 w-fit px-3"
          />
        ) : (
          <Popover
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
            content={
              <div className="w-full p-2 sm:w-40">
                <button
                  type="button"
                  disabled={!canDisconnect}
                  onClick={() => {
                    setOpenPopover(false);
                    onDisconnect?.();
                  }}
                  className={cn(
                    "w-full rounded-md p-2 text-left text-sm font-medium transition-colors",
                    canDisconnect
                      ? "text-red-600 hover:bg-red-600 hover:text-white"
                      : "cursor-not-allowed text-neutral-400",
                  )}
                >
                  Disconnect
                </button>
              </div>
            }
          >
            <button
              type="button"
              onClick={() => setOpenPopover(!openPopover)}
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            >
              <MoreVertical className="size-5" />
            </button>
          </Popover>
        )}
      </div>
    </div>
  );
}
