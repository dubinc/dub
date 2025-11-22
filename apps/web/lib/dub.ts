import { Dub } from "dub";

export const dub = new Dub({
  token: process.env.DUB_API_KEY,
  serverURL: process.env.DUB_API_BASE_URL ?? "http://localhost:8888/api",
});

// fetch Dub customer using their external ID (ID in our database)
// export const getDubCustomer = async (userId: string) => {
//   const customer = await dub.customers.list({
//     externalId: userId,
//     includeExpandedFields: true,
//   });

//   return customer.length > 0 ? customer[0] : null;
// };
export const getDubCustomer = async (userId: string) => {
  try {
    const customer = await dub.customers.list({ externalId: userId, includeExpandedFields: true });
    return customer[0] ?? null;
  } catch (err: any) {
    if (err?.statusCode === 403) {
      return null; // ignore coupon lookup locally
    }
    throw err;
  }
};