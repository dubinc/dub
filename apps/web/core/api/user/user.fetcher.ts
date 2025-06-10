import { ICustomerBody } from "core/integration/payment/config";
import { IDataRes } from "core/interfaces/common.interface.ts";
import { apiInstance } from "core/lib/rest-api";
import { IUserProfileRes } from "./user.interface";

// api
export const getUserProfileFetcher = async (url: string) => {
  const res = await apiInstance.get<Omit<IUserProfileRes, "sessions">>(url, {
    throwHttpErrors: false,
  });
  return await res.json();
};

export const updateUserProfileFetcher = async (
  url: string,
  { arg }: { arg: Partial<ICustomerBody> },
) => {
  const res = await apiInstance.patch<IDataRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};
