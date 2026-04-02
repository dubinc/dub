import {
  getOrCreateSiteLinksFolder,
  SITE_LINKS_FOLDER_NAME,
} from "@/lib/sitemaps/site-visit-tracking";
import { prisma } from "@dub/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dub/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    folder: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("getOrCreateSiteLinksFolder", () => {
  const projectId = "ws_test123";
  const userId = "user_test123";

  beforeEach(() => {
    vi.mocked(prisma.project.findUnique).mockReset();
    vi.mocked(prisma.project.update).mockReset();
    vi.mocked(prisma.folder.findFirst).mockReset();
    vi.mocked(prisma.folder.upsert).mockReset();
  });

  it("returns stored folder id from the column when it still exists", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      siteVisitTrackingSettings: {
        siteLinksFolderId: "fold_existing",
      },
    } as never);

    vi.mocked(prisma.folder.findFirst).mockResolvedValue({
      id: "fold_existing",
    } as never);

    const id = await getOrCreateSiteLinksFolder({ projectId, userId });

    expect(id).toBe("fold_existing");
    expect(prisma.folder.upsert).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("upserts by name when stored id is missing or stale, then persists to column", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      siteVisitTrackingSettings: {
        siteLinksFolderId: "fold_deleted",
      },
    } as never);

    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.folder.upsert).mockResolvedValue({
      id: "fold_from_upsert",
    } as never);

    vi.mocked(prisma.project.update).mockResolvedValue({} as never);

    const id = await getOrCreateSiteLinksFolder({ projectId, userId });

    expect(id).toBe("fold_from_upsert");
    expect(prisma.folder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name_projectId: {
            name: SITE_LINKS_FOLDER_NAME,
            projectId,
          },
        },
        update: {},
        create: expect.objectContaining({
          name: SITE_LINKS_FOLDER_NAME,
          projectId,
          accessLevel: "write",
        }),
      }),
    );

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: {
        siteVisitTrackingSettings: expect.objectContaining({
          siteLinksFolderId: "fold_from_upsert",
        }),
      },
    });
  });
});
