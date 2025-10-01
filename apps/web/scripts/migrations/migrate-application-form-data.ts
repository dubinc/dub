import { ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { ProgramApplication } from "@dub/prisma/client";
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

const defaultApplicationFormDataWithValues = (
  program: ProgramProps,
  application: ProgramApplication,
) => {
  return {
    fields: [
      {
        id: uuid(),
        type: "short-text",
        label: "Website / Social media channel",
        required: true,
        data: {
          placeholder: "https://example.com",
        },
        value: application.website || "",
      },
      {
        id: uuid(),
        type: "long-text",
        label: `How do you plan to promote ${program?.name ?? "us"}?`,
        required: true,
        value: application.proposal || "",
        data: {
          placeholder: "",
        },
      },
      {
        id: uuid(),
        type: "long-text",
        label: "Any additional questions or comments?",
        required: false,
        value: application.comments || "",
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

  console.log(`Found ${programs.length} programs.`);

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
    console.log(`Updated ${updatedGroups.count} groups`);

    // Now that we have applicationFormData we need to migrate all the applications for the program
    // by moving the contents of website, proposal, and comments into the formData field of the application
    const applications = await prisma.programApplication.findMany({
      where: {
        programId: program.id,
      },
    });

    console.log(`Found ${applications.length} applications to update`);

    for (const application of applications) {
      await prisma.programApplication.update({
        where: { id: application.id },
        data: {
          formData: defaultApplicationFormDataWithValues(program, application),
        },
      });
      console.log(`Updated application ${application.id}`);
    }
  }
}

main();
