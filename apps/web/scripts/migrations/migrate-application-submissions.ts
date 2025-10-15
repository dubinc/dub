// @ts-nocheck - old migration script

import { ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma, ProgramApplication } from "@dub/prisma/client";
import "dotenv-flow/config";
import { v4 as uuid } from "uuid";

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
    where: {
      applications: {
        some: {},
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  for (const program of programs) {
    // Now that we have applicationFormData we need to migrate all the applications for the program
    // by moving the contents of website, proposal, and comments into the formData field of the application
    const applications = await prisma.programApplication.findMany({
      where: {
        programId: program.id,
        formData: {
          equals: Prisma.DbNull,
        },
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
