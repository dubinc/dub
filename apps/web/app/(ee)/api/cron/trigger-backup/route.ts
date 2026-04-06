import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// Creates a PlanetScale branch backup
// Scheduled UTC: 12:40 AM, 8:40 AM, 12:40 PM, 8:40 PM (cron: 40 0,8,12,20 * * *)

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const tokenSecret = process.env.PLANETSCALE_SERVICE_TOKEN;

    if (!tokenSecret) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing PLANETSCALE_SERVICE_TOKEN",
      });
    }

    const res = await fetch(
      `https://api.planetscale.com/v1/organizations/dub/databases/dub/branches/main/backups`,
      {
        method: "POST",
        headers: {
          Authorization: `jynn53mcug4l:${tokenSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `cron-backup-${new Date().toISOString()}`,
          retention_value: 7,
          retention_unit: "day",
        }),
      },
    );

    const bodyText = await res.text();

    if (!res.ok) {
      throw new DubApiError({
        code: "internal_server_error",
        message: `PlanetScale backup failed (${res.status}): ${bodyText}`,
      });
    }

    const backup = JSON.parse(bodyText);
    console.log({ backup });

    return logAndRespond(
      `Created PlanetScale backup: ${backup.id} (${backup.name}) state=${backup.state}`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
