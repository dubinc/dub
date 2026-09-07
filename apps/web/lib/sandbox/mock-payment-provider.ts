export const SANDBOX_PAYMENT_METHOD = {
  id: "pm_sandbox_ach",
  type: "us_bank_account",
  us_bank_account: {
    last4: "1234",
  },
} as const;

class MockPaymentProvider {
  async retrievePaymentMethod(id: string) {
    return Promise.resolve({
      id,
      type: SANDBOX_PAYMENT_METHOD.type,
      customer: "cus_mock_123",
      us_bank_account: SANDBOX_PAYMENT_METHOD.us_bank_account,
    });
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
