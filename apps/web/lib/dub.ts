import { Dub } from "dub";

export const dub = new Dub();

// fetch Dub customer using their external ID (ID in our database)
export const getDubCustomer = async (userId: string) => {
  const customer = await dub.customers.list({
    externalId: userId,
    includeExpandedFields: true,
  });

  return customer.length > 0 ? customer[0] : null;
};
