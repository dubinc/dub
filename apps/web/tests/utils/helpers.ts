import { generateRandomName } from "@/lib/names";

export const randomId = () => Math.random().toString(36).substr(2, 9);

// Generate random customer data
export const randomCustomer = () => {
  const customerId = randomId();
  const customerName = generateRandomName();

  return {
    id: customerId,
    name: customerName,
    email: `${customerName.replace(" ", ".").toLowerCase()}@example.com`,
    avatar: `https://api.dicebear.com/9.x/notionists/png?seed=${customerId}`,
    metadata: { plan: "enterprise" },
  };
};
