import { ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { v4 as uuid } from "uuid";
import "dotenv-flow/config";
import { ProgramApplication } from "@prisma/client";

const defaultApplicationFormData = (program: ProgramProps) => {
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

const defaultApplicationFormDataWithValues = (program: ProgramProps, application: ProgramApplication) => {
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
  const now = new Date();
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs.`);

  for (const program of programs) {
    const groupIds = program.groups.map(({ id }) => id);
    if (program.applicationFormData && (program.applicationFormData as any).fields.length > 0) {
      // Fill the group applicationFormData with the program applicationFormData
      await prisma.partnerGroup.updateMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        data: {
          applicationFormData: program.applicationFormData,
          applicationFormPublishedAt: now,
        },
      });
    } else {
      // Use the default applicationFormData
      const applicationFormData = defaultApplicationFormData(program);

      await prisma.partnerGroup.updateMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        data: {
          applicationFormData,
          applicationFormPublishedAt: now,
        },
      });
    }

    // Now that we have applicationFormData we need to migrate all the applications for the program
    // by moving the contents of website, proposal, and comments into the formData field of the application
    const applications = await prisma.programApplication.findMany({
      where: {
        programId: program.id,
      },
    });
    
    for (const application of applications) {
      await prisma.programApplication.update({
        where: { id: application.id },
        data: { formData: defaultApplicationFormDataWithValues(program, application) },
      });
    }
  }
}

main();
