import { Prisma } from "@prisma/client";
import { generateRandomString } from "../api/utils/generate-random-string";

const MAX_SLUG_ATTEMPTS = 3;

export function getPreferredStagingSlug(slug: string) {
  return `${slug}-staging`;
}

export function isSlugUniqueConstraintError(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : [target];

  return fields.some(
    (field) => typeof field === "string" && field.includes("slug"),
  );
}

// Workspace and program slugs are globally unique, and `{slug}-staging` can
// already belong to an unrelated workspace or program (e.g. one created
// manually before staging existed). Retry with a random suffix so staging
// provisioning still completes. The staging short domain is derived from the
// production slug, so it does not depend on this value.
export async function withStagingSlugRetry<T>(
  slug: string,
  create: (stagingSlug: string) => Promise<T>,
) {
  const preferredSlug = getPreferredStagingSlug(slug);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const stagingSlug =
      attempt === 0
        ? preferredSlug
        : `${preferredSlug}-${generateRandomString(4).toLowerCase()}`;

    try {
      return await create(stagingSlug);
    } catch (error) {
      if (
        !isSlugUniqueConstraintError(error) ||
        attempt === MAX_SLUG_ATTEMPTS - 1
      ) {
        throw error;
      }
    }
  }

  throw new Error(`Failed to find an available staging slug for ${slug}.`);
}
