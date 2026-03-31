import { createId } from "@/lib/api/create-id";
import { siteVisitTrackingSettingsSchema } from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

export const SITE_LINKS_FOLDER_NAME = "Site Links";

function parseSiteVisitTrackingSettings(store: unknown) {
  if (!store || typeof store !== "object") {
    return siteVisitTrackingSettingsSchema.parse({});
  }

  const raw = (store as Record<string, unknown>).siteVisitTrackingSettings;
  const parsed = siteVisitTrackingSettingsSchema.safeParse(raw);
  return parsed.success
    ? parsed.data
    : siteVisitTrackingSettingsSchema.parse({});
}

export async function getOrCreateSiteLinksFolder({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { store: true },
  });

  const storeRecord = (project?.store ?? null) as Record<
    string,
    unknown
  > | null;
  const settings = parseSiteVisitTrackingSettings(storeRecord);
  const storedFolderId = settings.siteLinksFolderId;

  if (storedFolderId) {
    const existingById = await prisma.folder.findFirst({
      where: {
        id: storedFolderId,
        projectId,
      },
      select: { id: true },
    });

    if (existingById) {
      return existingById.id;
    }
  }

  const newFolderId = createId({ prefix: "fold_" });

  const folder = await prisma.folder.upsert({
    where: {
      name_projectId: {
        name: SITE_LINKS_FOLDER_NAME,
        projectId,
      },
    },
    update: {},
    create: {
      id: newFolderId,
      name: SITE_LINKS_FOLDER_NAME,
      projectId,
      accessLevel: "write",
      users: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
  });

  const prev = storeRecord ?? {};
  const prevSettings = parseSiteVisitTrackingSettings(prev);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      store: {
        ...prev,
        siteVisitTrackingSettings: {
          ...prevSettings,
          siteLinksFolderId: folder.id,
        },
      } as Prisma.InputJsonValue,
    },
  });

  return folder.id;
}
