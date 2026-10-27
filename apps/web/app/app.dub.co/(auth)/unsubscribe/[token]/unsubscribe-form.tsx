"use client";

import {
  NOTIFICATION_PREFERENCE_LABELS,
  NOTIFICATION_PREFERENCE_TYPES,
  NotificationPreferenceType,
} from "@/lib/constants/notification-preferences";
import { Button, Switch } from "@dub/ui";
import { DubLinksIcon, DubPartnersIcon, UserPlus } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";

type PreferenceState = Record<NotificationPreferenceType, boolean>;

const NOTIFICATION_ICONS: Record<
  NotificationPreferenceType,
  React.ComponentType<{ className?: string }>
> = {
  dubLinks: DubLinksIcon,
  dubPartners: DubPartnersIcon,
  partnerAccount: UserPlus,
};

export function UnsubscribeForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [preferences, setPreferences] = useState<PreferenceState>(() => {
    const initial: Partial<PreferenceState> = {};
    NOTIFICATION_PREFERENCE_TYPES.forEach((type) => {
      initial[type] = true;
    });
    return initial as PreferenceState;
  });

  const [saving, setSaving] = useState(false);
  const [originalPreferences, setOriginalPreferences] =
    useState<PreferenceState | null>(null);

  // Fetch initial preferences from API
  const {
    data: fetchedPreferences,
    error,
    isLoading: loading,
  } = useSWRImmutable<PreferenceState>(
    `/api/user/notification-preferences?token=${encodeURIComponent(token)}`,
    fetcher,
  );

  // Sync fetched preferences to state
  useEffect(() => {
    if (fetchedPreferences) {
      setPreferences(fetchedPreferences);
      setOriginalPreferences(fetchedPreferences);
    }
  }, [fetchedPreferences]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load preferences",
      );
    }
  }, [error]);

  // Check if form is dirty (has changes)
  const isDirty = useMemo(() => {
    if (!originalPreferences) return false;
    return NOTIFICATION_PREFERENCE_TYPES.some(
      (type) => preferences[type] !== originalPreferences[type],
    );
  }, [preferences, originalPreferences]);

  const handleToggle = useCallback(
    (type: NotificationPreferenceType) => (checked: boolean) => {
      setPreferences((prev) => ({
        ...prev,
        [type]: checked,
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, preferences }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      // Update original preferences after successful save
      setOriginalPreferences(preferences);
      toast.success("Your preferences have been saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [token, preferences]);

  const handleUnsubscribeAll = useCallback(async () => {
    const confirmed = window.confirm(
      "Are you sure you want to unsubscribe from all emails?",
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);

    const allOff: PreferenceState = {} as PreferenceState;
    NOTIFICATION_PREFERENCE_TYPES.forEach((type) => {
      allOff[type] = false;
    });

    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, preferences: allOff }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unsubscribe");
      }

      setPreferences(allOff);
      setOriginalPreferences(allOff);
      toast.success("You have been unsubscribed from all emails!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [token]);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 border-b border-neutral-200 bg-white px-4 py-6 pt-8 text-center sm:rounded-t-2xl sm:px-6 md:px-16">
        <h2 className="text-lg font-semibold text-neutral-900">
          Email Preferences
        </h2>
        <p className="text-sm text-neutral-500">
          Manage your email subscriptions for{" "}
          <span className="font-medium text-neutral-700">{email}</span>
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-white px-4 py-6 sm:px-6 md:px-10">
        <div className="divide-y divide-neutral-100">
          {NOTIFICATION_PREFERENCE_TYPES.map((type) => {
            const { title, description, link } =
              NOTIFICATION_PREFERENCE_LABELS[type];
            const isEnabled = preferences[type];
            const Icon = NOTIFICATION_ICONS[type];

            return (
              <div
                key={type}
                className="flex items-start justify-between gap-3 py-5 first:pt-0 sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <a
                    href={link}
                    target="_blank"
                    className="flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2 transition-colors hover:border-neutral-300 hover:from-neutral-200 sm:p-2.5"
                  >
                    <Icon className="size-4 sm:size-5" />
                  </a>
                  <div className="min-w-0 flex-1 pr-2 sm:pr-4">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <a href={link} target="_blank">
                        <h3 className="cursor-help text-sm font-medium text-neutral-900 underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-600">
                          {title}
                        </h3>
                      </a>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm">
                      {description}
                    </p>
                  </div>
                </div>
                <Switch
                  loading={loading}
                  checked={isEnabled}
                  disabled={saving}
                  fn={handleToggle(type)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col space-y-2 border-t border-neutral-200 bg-white px-4 py-6 sm:rounded-b-2xl sm:px-6 md:px-10">
        <Button
          text={saving ? "Saving..." : "Save Preferences"}
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty || saving}
          className="w-full"
        />

        <button
          type="button"
          onClick={handleUnsubscribeAll}
          disabled={saving}
          className="mt-2 w-full text-center text-xs text-neutral-400 transition-colors hover:text-neutral-600 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          Unsubscribe from all emails
        </button>
      </div>
    </>
  );
}
