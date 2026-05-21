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
