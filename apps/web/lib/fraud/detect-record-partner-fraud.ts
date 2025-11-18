import { prisma } from "@dub/prisma";
import { FraudEvent } from "@dub/prisma/client";
import { createId } from "../api/create-id";
import { PartnerProps } from "../types";
import { FRAUD_RULES_BY_SCOPE } from "./constants";
import { executeFraudRule } from "./execute-fraud-rule";

interface PartnerFraudProps {
  program: {
    id: string;
  };
  partner: Pick<
    PartnerProps,
    | "id"
    | "email"
    | "website"
    | "websiteVerifiedAt"
    | "youtube"
    | "youtubeVerifiedAt"
    | "twitter"
    | "twitterVerifiedAt"
    | "linkedin"
    | "linkedinVerifiedAt"
    | "instagram"
    | "instagramVerifiedAt"
    | "tiktok"
    | "tiktokVerifiedAt"
  >;
}

export async function detectAndRecordPartnerFraud(context: PartnerFraudProps) {
  console.log(
    "[detectAndRecordPartnerFraud] context",
    JSON.stringify(context, null, 2),
  );

  if (!context.partner.id || !context.program.id) {
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
      const { triggered } = await executeFraudRule(rule.type, context);

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
        programId: context.program.id,
        partnerId: context.partner.id,
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
