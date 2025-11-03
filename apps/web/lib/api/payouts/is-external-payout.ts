import { ProgramProps } from "@/lib/types";

interface IsExternalPayoutProps {
  program: Pick<ProgramProps, "payoutMode">;
  payout: {
    partner: {
      payoutsEnabledAt: Date | null;
    };
  };
}

// Determines whether a given payout should be treated as "external"
// - internal → always handled internally
// - external → all payouts are external
// - hybrid   → payouts are external only if the payoutsEnabledAt is null
export function isExternalPayout({
  payout,
  program,
}: IsExternalPayoutProps): boolean {
  switch (program.payoutMode) {
    case "internal":
      return false;
    case "external":
      return true;
    case "hybrid":
      return payout.partner.payoutsEnabledAt === null;
    default:
      throw new Error(`Invalid payout mode: ${program.payoutMode}`);
  }
}
