import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { DEFAULT_PARTNER_GROUP, GroupSchema } from "@/lib/zod/schemas/groups";
import { RESOURCE_COLORS } from "@/ui/colors";
import { prisma } from "@dub/prisma";
import { nanoid, randomValue } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// POST /api/groups/[groupIdOrSlug]/default – set a group as default
export const POST = withWorkspace(
  async ({ params, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const [group, currentDefaultGroup] = await Promise.all([
      getGroupOrThrow({
        programId,
        groupId: params.groupIdOrSlug,
      }),
      prisma.partnerGroup.findUniqueOrThrow({
        where: {
          programId_slug: {
            programId,
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
        include: {
          program: {
            select: {
              slug: true,
            },
          },
        },
      }),
    ]);

    // return the current default group if it's already the default group
    if (group.id === currentDefaultGroup.id) {
      return NextResponse.json(GroupSchema.parse(currentDefaultGroup));
    }

    const updatedGroup = await prisma.$transaction(async (tx) => {
      const DEFAULT_GROUP_NAME_OLD = "Default Group (old)";
      const isStandardDefaultGroupName =
        currentDefaultGroup.name.toLowerCase() ===
        DEFAULT_PARTNER_GROUP.name.toLowerCase();
      // set current default group's slug to a slugified version of its name
      // and assign a random color if it doesn't have one
      await tx.partnerGroup.update({
        where: {
          programId_slug: {
            programId,
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
        data: {
          name: isStandardDefaultGroupName ? DEFAULT_GROUP_NAME_OLD : undefined,
          slug: `${
            isStandardDefaultGroupName
              ? "old-default-group"
              : slugify(currentDefaultGroup.name)
          }-${nanoid(4)}`,
          color:
            currentDefaultGroup.color === DEFAULT_PARTNER_GROUP.color
              ? randomValue(RESOURCE_COLORS)
              : undefined,
        },
      });
      await tx.program.update({
        where: {
          id: programId,
        },
        data: {
          defaultGroupId: group.id,
        },
      });
      return await tx.partnerGroup.update({
        where: {
          id: group.id,
        },
        data: {
          name:
            group.name === DEFAULT_GROUP_NAME_OLD
              ? DEFAULT_PARTNER_GROUP.name
              : undefined,
          slug: DEFAULT_PARTNER_GROUP.slug,
          color: DEFAULT_PARTNER_GROUP.color,
        },
      });
    });

    const programSlug = currentDefaultGroup.program.slug;

    // need to revalidate the program's cached public pages
    waitUntil(
      Promise.allSettled([
        revalidatePath(`/partners.dub.co/${programSlug}`),
        revalidatePath(`/partners.dub.co/${programSlug}/apply`),
        revalidatePath(`/partners.dub.co/${programSlug}/apply/success`),
      ]),
    );

    return NextResponse.json(GroupSchema.parse(updatedGroup));
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
