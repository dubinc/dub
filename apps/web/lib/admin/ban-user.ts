import { prisma } from "@/lib/prisma";
import { WorkspaceRole } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { updateConfig } from "../edge-config";
import { extractEmailDomain } from "../email/extract-email-domain";
import { storage } from "../storage";
import { getOwnedAssetKey } from "../storage/asset-keys";
import { deleteWorkspace } from "./delete-workspace";

type BanUserProps = {
  email: string;
  blockEmailDomain: boolean;
};

export async function banUser({ email, blockEmailDomain }: BanUserProps) {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      image: true,
      projects: {
        where: {
          role: WorkspaceRole.owner,
        },
        select: {
          project: {
            select: {
              id: true,
              slug: true,
              stripeId: true,
              defaultProgramId: true,
            },
          },
        },
      },
    },
  });

  const emailDomain = extractEmailDomain(email);

  // Block email in edge config first so that no feedback emails are sent
  await Promise.all([
    updateConfig({
      key: "emails",
      value: email,
    }),

    blockEmailDomain &&
      emailDomain &&
      updateConfig({
        key: "emailDomainTerms",
        value: emailDomain,
      }),
  ]);

  // TODO:
  // This is doing too much in one function.
  // We should move this to a background job to make sure it reliably deletes the user and workspaces.
  waitUntil(deleteBannedUser(user));

  return user;
}

export async function deleteBannedUser(
  user: Awaited<ReturnType<typeof banUser>>,
) {
  const workspacesToDelete = user.projects.map(({ project }) => project);

  await Promise.allSettled(
    workspacesToDelete.map((workspace) => deleteWorkspace(workspace)),
  );

  await prisma.user.delete({
    where: {
      id: user.id,
    },
  });

  const imageKey = getOwnedAssetKey({
    kind: "userAvatar",
    ownerId: user.id,
    url: user.image,
  });

  if (imageKey) {
    await storage.delete({
      key: imageKey,
    });
  }
}
