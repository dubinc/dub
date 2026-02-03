export interface PayoutFeeWithWaiverParams {
  payoutAmount: number;
  payoutFeeWaiverLimit: number;
  payoutFeeWaivedUsage: number;
  payoutFee: number;
  fastAchFee?: number;
}

// Calculates payout fee with tiered waiver logic
export function calculatePayoutFeeWithWaiver({
  payoutAmount,
  payoutFeeWaiverLimit,
  payoutFeeWaivedUsage,
  payoutFee,
  fastAchFee = 0,
}: PayoutFeeWithWaiverParams) {
  if (payoutFeeWaiverLimit === 0) {
    return {
      feeFreeAmount: 0,
      feeChargedAmount: payoutAmount,
      freeTierRemaining: 0,
      fee: Math.round(payoutAmount * payoutFee) + fastAchFee,
    };
  }

  // Split the payout amount between free tier (0% fee) and fee charged (normal rate)
  const freeTierRemaining = Math.max(
    0,
    payoutFeeWaiverLimit - payoutFeeWaivedUsage,
  );
  const feeFreeAmount = Math.min(payoutAmount, freeTierRemaining);
  const feeChargedAmount = payoutAmount - feeFreeAmount;

  return {
    feeFreeAmount,
    feeChargedAmount,
    freeTierRemaining,
    fee: Math.round(feeChargedAmount * payoutFee) + fastAchFee,
  };
}
