import { ProgramProps } from "@/lib/types";

interface IsExternalPayoutProps {
  program: Pick<ProgramProps, "payoutMode">;
  payout: {
    partner: {
      payoutsEnabledAt: Date | null;
    };
  };
}

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
