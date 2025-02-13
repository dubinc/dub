import { getEvents } from "@/lib/analytics/get-events";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { throwIfClicksUsageExceeded } from "@/lib/api/links/usage-checks";
import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { Link } from "@dub/prisma/client";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    throwIfClicksUsageExceeded(workspace);

    const parsedParams = eventsQuerySchema.parse(searchParams);

    let {
      event,
      interval,
      start,
      end,
      linkId,
      externalId,
      domain,
      key,
      folderId,
    } = parsedParams;

    let link: Link | null = null;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    if (linkId || externalId || (domain && key)) {
      link = await getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
        externalId,
        domain,
        key,
      });
    }

    const folderIdToVerify = link?.folderId || folderId;

    if (folderIdToVerify) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: folderIdToVerify,
        requiredPermission: "folders.read",
      });
    }

    validDateRangeForPlan({
      plan: workspace.plan,
      dataAvailableFrom: workspace.createdAt,
      interval,
      start,
      end,
      throwError: true,
    });

    // If the request is not for a specific folder, find folders the user has access to + unsorted folder
    let folderIds: string[] | undefined = undefined;

    if (!folderIdToVerify) {
      const { canManageFolderPermissions } = getPlanCapabilities(
        workspace.plan,
      );

      if (canManageFolderPermissions) {
        const folders = await getFolders({
          workspaceId: workspace.id,
          userId: session.user.id,
        });

        folderIds = folders.map((folder) => folder.id).concat("");
      }
    }

    const response = await getEvents({
      ...parsedParams,
      event,
      ...(link && { linkId: link.id }),
      workspaceId: workspace.id,
      folderIds,
      folderId: folderId || "",
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
    requiredPermissions: ["analytics.read"],
  },
);
