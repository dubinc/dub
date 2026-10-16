import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { redis } from "@/lib/upstash";
import { TZDate } from "@date-fns/tz";
import { sendBatchEmail } from "@dub/email";
import CriticalApiFailed from "@dub/email/templates/critical-api-failed";
import { WorkspaceRole } from "@prisma/client";
import { addHours, format } from "date-fns";
import * as z from "zod/v4";
import { CRITICAL_API_ALERT_COOLDOWN_SECONDS } from "./constants";
import { criticalApiFailureRowSchema } from "./get-critical-api-failures";

type FailureRow = z.infer<typeof criticalApiFailureRowSchema>;
type WorkspaceFailure = Omit<FailureRow, "workspaceId">;

// Redis key used to cooldown alerts per workspace (one email covers all failing endpoints).
function alertCooldownKey(workspaceId: string) {
  return `critical-api-failure-alert:${workspaceId}`;
}

// Formats the checked hour window for the email body (e.g. "Oct 16, 2026, 14:00–15:00 UTC").
function formatHourLabel(hour: Date) {
  const start = new TZDate(hour, "UTC");
  const end = addHours(start, 1);

  return `${format(start, "MMM d, yyyy, HH:mm")}–${format(end, "HH:mm")} UTC`;
}

// Groups Tinybird failure rows by workspace so we can notify owners once per workspace.
function groupFailuresByWorkspace(rows: FailureRow[]) {
  const byWorkspace = new Map<string, WorkspaceFailure[]>();

  for (const { workspaceId, ...failure } of rows) {
    const existing = byWorkspace.get(workspaceId) ?? [];
    existing.push(failure);
    byWorkspace.set(workspaceId, existing);
  }

  return byWorkspace;
}

// Keeps one failure per method + route (highest count) when multiple status codes fail.
function pickHighestFailurePerEndpoint(failures: WorkspaceFailure[]) {
  const byEndpoint = new Map<string, WorkspaceFailure>();

  for (const failure of failures) {
    const key = `${failure.method}:${failure.routePattern}`;
    const current = byEndpoint.get(key);
    if (!current || failure.failureCount > current.failureCount) {
      byEndpoint.set(key, failure);
    }
  }

  return [...byEndpoint.values()];
}

// Claims the workspace alert slot via Redis NX so we don't re-alert within the cooldown window.
async function claimAlertSlot({
  workspaceId,
  failures,
}: {
  workspaceId: string;
  failures: WorkspaceFailure[];
}) {
  const acquired = await redis.set(alertCooldownKey(workspaceId), "1", {
    nx: true,
    ex: CRITICAL_API_ALERT_COOLDOWN_SECONDS,
  });

  if (!acquired) {
    return [];
  }

  return pickHighestFailurePerEndpoint(failures);
}

// Clears the workspace cooldown so the next cron can retry after a send failure.
async function releaseAlertSlot(workspaceId: string) {
  await redis.del(alertCooldownKey(workspaceId));
}

// Emails workspace owners about critical API failures that passed the cooldown check.
export async function notifyCriticalApiFailures({
  hour,
  rows,
}: {
  hour: Date;
  rows: FailureRow[];
}) {
  if (rows.length === 0) {
    return {
      workspacesNotified: 0,
      emailsQueued: 0,
    };
  }

  const byWorkspace = groupFailuresByWorkspace(rows);
  const hourLabel = formatHourLabel(hour);
  let workspacesNotified = 0;

  let emailsQueued = 0;

  for (const [workspaceId, failures] of byWorkspace) {
    const claimedFailures = await claimAlertSlot({
      workspaceId,
      failures,
    });

    if (claimedFailures.length === 0) {
      continue;
    }

    let workspace: Awaited<ReturnType<typeof getWorkspaceUsers>>;

    try {
      workspace = await getWorkspaceUsers({
        workspaceId,
        role: WorkspaceRole.owner,
      });
    } catch (error) {
      console.error(
        `Failed to load workspace ${workspaceId} for critical API failure alert:`,
        error,
      );
      continue;
    }

    if (workspace.users.length === 0) {
      console.info(
        `No owners found for workspace ${workspaceId}. Skipping critical API failure alert.`,
      );
      continue;
    }

    const subject =
      claimedFailures.length === 1
        ? `Your API requests to ${claimedFailures[0].method} ${claimedFailures[0].routePattern} are failing`
        : `Critical API endpoints are failing in ${workspace.name}`;

    const { error } = await sendBatchEmail(
      workspace.users.map((user) => ({
        variant: "notifications" as const,
        subject,
        to: user.email,
        react: CriticalApiFailed({
          email: user.email,
          workspace: {
            name: workspace.name,
            slug: workspace.slug,
          },
          failures: claimedFailures,
          hourLabel,
        }),
      })),
    );

    if (error) {
      console.error(
        `Failed to send critical API failure alert for workspace ${workspaceId}:`,
        error,
      );
      // Release cooldown so the next hourly cron can retry.
      await releaseAlertSlot(workspaceId);
      continue;
    }

    workspacesNotified += 1;
    emailsQueued += workspace.users.length;
    console.info(
      `Sent critical API failure alert to ${workspace.users.length} owner(s) for workspace ${workspace.slug} (${claimedFailures.map((f) => `${f.method} ${f.routePattern}`).join(", ")})`,
    );
  }

  return {
    workspacesNotified,
    emailsQueued,
  };
}
