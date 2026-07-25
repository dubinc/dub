import { prisma } from "@/lib/prisma";
import { createTremendousCampaign } from "@/lib/tremendous/create-tremendous-campaign";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
});

export const createTremendousCampaignJob = defineJob({
  name: "create-tremendous-campaign-job",
  schema: inputSchema,
  defaults: {
    retries: 3,
  },
  async handle(input) {
    const { programId } = input;

    const program = await prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        tremendousCampaignId: true,
      },
    });

    if (!program) {
      console.error(
        `[createTremendousCampaignJob] Program ${programId} not found. Skipping...`,
      );
      return;
    }

    if (program.tremendousCampaignId) {
      console.log(
        `[createTremendousCampaignJob] Program ${programId} already has a Tremendous campaign. Skipping...`,
      );
      return;
    }

    await createTremendousCampaign(program);

    console.log(
      `[createTremendousCampaignJob] Created Tremendous campaign for program ${programId}.`,
    );
  },
});
