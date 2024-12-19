import { storage } from "@/lib/storage";
import { Prisma } from "@dub/prisma/client";
import { R2_URL } from "@dub/utils";

export const deleteScreenshots = async (
  screenshots: Prisma.JsonValue | null,
) => {
  const images = screenshots as string[];

  if (!images || images.length === 0) {
    return;
  }

  return await Promise.all(
    images.map(async (image: string) => {
      if (image.startsWith(`${R2_URL}/integration-screenshots`)) {
        return storage.delete(image.replace(`${R2_URL}/`, ""));
      }
    }),
  );
};
