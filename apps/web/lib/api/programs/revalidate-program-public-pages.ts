import { prisma } from "@/lib/prisma";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export function revalidateProgramPublicPages(programId: string) {
  after(async () => {
    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      select: {
        slug: true,
        addedToMarketplaceAt: true,
        groups: { select: { slug: true } },
      },
    });

    const paths = [
      `/partners.dub.co/${program.slug}`,
      `/partners.dub.co/${program.slug}/apply`,
      `/partners.dub.co/${program.slug}/apply/success`,
      ...program.groups
        .filter((group) => group.slug !== DEFAULT_PARTNER_GROUP.slug)
        .flatMap((group) => [
          `/partners.dub.co/${program.slug}/${group.slug}`,
          `/partners.dub.co/${program.slug}/${group.slug}/apply`,
          `/partners.dub.co/${program.slug}/${group.slug}/apply/success`,
        ]),
      ...(program.addedToMarketplaceAt
        ? [`/partners.dub.co/marketplace/${program.slug}`]
        : []),
    ];

    paths.forEach((path) => revalidatePath(path));
  });
}
