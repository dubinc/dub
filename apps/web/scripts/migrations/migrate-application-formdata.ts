import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { v4 as uuid } from "uuid";

const defaultApplicationFormData = (program) => {
  return {
    label: program.applicationFormData?.label || "",
    title: program.applicationFormData?.title || "",
    description: program.applicationFormData?.description || "",
    fields: [
      {
        id: uuid(),
        type: "short-text",
        label: "Website / Social media channel",
        required: true,
        data: {
          placeholder: "https://example.com",
        },
      },
      {
        id: uuid(),
        type: "long-text",
        label: `How do you plan to promote ${program?.name ?? "us"}?`,
        required: true,
        data: {
          placeholder: "",
        },
      },
      {
        id: uuid(),
        type: "long-text",
        label: "Any additional questions or comments?",
        required: false,
        data: {
          placeholder: "",
        },
      },
    ],
  };
};

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs to update.`);
  console.table(programs, ["name", "slug", "landerPublishedAt"]);

  for (const program of programs) {
    const groupIds = program.groups.map(({ id }) => id);

    // Use the default applicationFormData
    const applicationFormData = defaultApplicationFormData(program);

    const updatedGroups = await prisma.partnerGroup.updateMany({
      where: {
        id: {
          in: groupIds,
        },
      },
      data: {
        applicationFormData,
      },
    });
    console.log(
      `Updated ${updatedGroups.count} groups with the program application form data`,
    );

    const updatedDefaultGroup = await prisma.partnerGroup.update({
      where: {
        programId_slug: {
          programId: program.id,
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
      },
      data: {
        applicationFormPublishedAt: program.landerPublishedAt || new Date(),
      },
    });
    console.log(
      `Updated default group applicationFormPublishedAt to ${updatedDefaultGroup.applicationFormPublishedAt}`,
    );
  }
}

main();
