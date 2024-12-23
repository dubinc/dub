import { Dub } from "dub";

export const dub = new Dub();

export const getDubCustomer = async (userId: string) => {
  try {
    return await dub.customers.get({
      id: `ext_${userId}`,
    });
  } catch (error) {
    return null;
  }
};
