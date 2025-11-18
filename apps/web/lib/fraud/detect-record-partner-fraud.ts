import { prisma } from "@dub/prisma";
import { FraudEvent } from "@dub/prisma/client";
import { z } from "zod";
import { createId } from "../api/create-id";
import { PartnerSchema } from "../zod/schemas/partners";
import { ProgramSchema } from "../zod/schemas/programs";
import { FRAUD_RULES_BY_SCOPE } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";

const contextSchema = z.object({
  program: ProgramSchema.pick({ id: true }),
  partner: PartnerSchema.pick({
    id: true,
    email: true,
    website: true,
    websiteVerifiedAt: true,
    youtube: true,
    youtubeVerifiedAt: true,
    twitter: true,
    twitterVerifiedAt: true,
    linkedin: true,
    linkedinVerifiedAt: true,
    instagram: true,
    instagramVerifiedAt: true,
    tiktok: true,
    tiktokVerifiedAt: true,
  }),
});

export async function detectAndRecordPartnerFraud(
  context: z.infer<typeof contextSchema>,
) {
  const result = contextSchema.safeParse(context);

  if (!result.success) {
    console.error(
      "[detectAndRecordPartnerFraud] Invalid context:",
      result.error.message,
    );
    return;
  }

  const validatedContext = result.data;

  console.log(
    "[detectAndRecordPartnerFraud] context",
    JSON.stringify(validatedContext, null, 2),
  );

  if (!validatedContext.partner.id || !validatedContext.program.id) {
    console.log(
      "[detectAndRecordFraudApplicant] The partner or program is not found.",
    );
    return;
  }

  const fraudRules = FRAUD_RULES_BY_SCOPE["partner"];

  if (fraudRules.length === 0) {
    console.log(
      "[detectAndRecordPartnerFraud] No fraud rules found with scope partner.",
    );
    return;
  }

  const triggeredRules: Pick<FraudEvent, "type">[] = [];

  // Evaluate each rule
  for (const rule of fraudRules) {
    try {
      const { triggered } = await executeFraudRule(rule.type, validatedContext);

      if (triggered) {
        triggeredRules.push({
          type: rule.type,
        });
      }
    } catch (error) {
      console.error(
        `[detectAndRecordPartnerFraud] Error evaluating rule ${rule.type}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("[detectAndRecordPartnerFraud] triggeredRules", triggeredRules);

  try {
    await prisma.fraudEvent.createMany({
      data: triggeredRules.map((rule) => ({
        id: createId({ prefix: "fraud_" }),
        programId: validatedContext.program.id,
        partnerId: validatedContext.partner.id,
        type: rule.type,
      })),
    });
  } catch (error) {
    console.error(
      "[detectAndRecordPartnerFraud] Error recording partner fraud events.",
      error,
    );
  }
}
