export const SANDBOX_PAYMENT_METHOD = {
  id: "pm_sandbox_card",
  type: "card",
  card: {
    brand: "[DEMO] mastercard",
    last4: "1234",
  },
} as const;

class MockPaymentProvider {
  async retrievePaymentMethod(id: string) {
    return Promise.resolve({
      id,
      type: "us_bank_account" as const,
      customer: "cus_mock_123",
    });
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
