import {
  createFraudEventFingerprint,
  createHashKey,
} from "@/lib/api/fraud/utils";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_1K2J9DRWPPJ2F1RX53N92TSGA";
  const partnerId = "pn_1KANAX74GSBZK1TEP52BFWT6R";
  const type = "customerEmailMatch";

  const fingerprint = createFraudEventFingerprint({
    programId,
    partnerId,
    type,
    metadata: {
      customerId: "101",
    },
  });

  // referralSourceBanned
  // paidTrafficDetected
  // partnerCrossProgramBan // Cross-program ban from other programs
  // partnerDuplicatePayoutMethod // Duplicate payout method with other partners
  // partnerFraudReport // Fraud repo

  console.log({fingerprint});

  // const identityKey = createFraudEventIdentityKey({
  //   programId,
  //   type,
  //   identityKey: partnerId
  // });

  // await prisma.fraudEventGroup.create({
  //   data: {
  //     id: createId({ prefix: "frg_" }),
  //     programId,
  //     partnerId,
  //     type,
  //     identityKey,
  //   },
  // });
}

export function createFraudEventIdentityKey(input: {
  programId: string;
  type: string;
  identityKey: string;
}): string {
  const parts = [input.programId, input.type, input.identityKey].map((p) =>
    p!.toLowerCase(),
  );

  return createHashKey(parts.join("|"));
}

main();
