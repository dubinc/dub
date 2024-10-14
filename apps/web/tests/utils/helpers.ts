import { generateRandomName } from "@/lib/names";
import { nanoid } from "@dub/utils";

export const randomId = () => nanoid(24);

// Generate random customer data
export const randomCustomer = () => {
  const customerId = `cus_${randomId()}`;
  const customerName = generateRandomName();

  return {
    id: customerId,
    name: customerName,
    email: `${customerName.split(" ").join(".").toLowerCase()}@example.com`,
    avatar: `https://api.dicebear.com/9.x/notionists/png?seed=${customerId}`,
  };
};
