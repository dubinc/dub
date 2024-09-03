export const randomId = () => Math.random().toString(36).substr(2, 9);

// Generate random customer data
export const randomCustomer = () => {
  const customerId = randomId();

  return {
    id: customerId,
    name: `name-${customerId}`,
    email: `email-${customerId}@example.com`,
    avatar: `https://example.com/avatar-${customerId}.png`,
    metadata: { plan: "enterprise" },
  };
};
