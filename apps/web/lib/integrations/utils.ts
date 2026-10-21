import { DubApiError } from "@/lib/api/errors";
import { storage } from "@/lib/storage";
import { getOwnedAssetKey } from "@/lib/storage/asset-keys";
import { Prisma } from "@prisma/client";

function toScreenshotList(screenshots: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(screenshots)) {
    return [];
  }

  return screenshots.filter(
    (screenshot): screenshot is string => typeof screenshot === "string",
  );
}

/**
 * Deletes screenshots that belong to `workspaceId` (the workspace that owns
 * the integration). Screenshots owned by anyone else, and legacy screenshots
 * without an owner in their key, are left alone.
 */
export const deleteScreenshots = async ({
  screenshots,
  workspaceId,
}: {
  screenshots: Prisma.JsonValue | null | undefined;
  workspaceId: string;
}) => {
  const keys = toScreenshotList(screenshots)
    .map((url) =>
      getOwnedAssetKey({
        kind: "integrationScreenshot",
        ownerId: workspaceId,
        url,
      }),
    )
    .filter((key): key is string => key !== null);

  return await Promise.all(
    keys.map((key) =>
      storage.delete({
        key,
      }),
    ),
  );
};

/**
 * Rejects screenshots the workspace doesn't own. A screenshot is allowed if
 * it was uploaded by this workspace, or is already saved on this integration.
 */
export function throwIfForeignScreenshots({
  screenshots,
  workspaceId,
  existingScreenshots,
}: {
  screenshots: string[] | null | undefined;
  workspaceId: string;
  existingScreenshots?: Prisma.JsonValue | null;
}) {
  const existing = new Set(toScreenshotList(existingScreenshots));

  const foreign = (screenshots ?? []).filter(
    (url) =>
      !existing.has(url) &&
      !getOwnedAssetKey({
        kind: "integrationScreenshot",
        ownerId: workspaceId,
        url,
      }),
  );

  if (foreign.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "Screenshots must be uploaded by this workspace.",
    });
  }
}
