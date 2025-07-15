import { apiInstance } from "core/lib/rest-api";
import {
  ICreatePaymentBody,
  ICreatePaymentRes,
  ICreateSessionBody,
  ICreateSessionRes,
  IUpdateSessionBody,
  IUpdateSessionRes,
} from "./payment.interface";

// api
export const createUserSessionFetcher = async (
  url: string,
  { arg }: { arg?: ICreateSessionBody },
) => {
  const res = await apiInstance.post<ICreateSessionRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};

// api
export const updateUserSessionFetcher = async (
  url: string,
  { arg }: { arg?: IUpdateSessionBody },
) => {
  const res = await apiInstance.patch<IUpdateSessionRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};

export const createUserPaymentFetcher = async (
  url: string,
  { arg }: { arg?: ICreatePaymentBody },
) => {
  const res = await apiInstance.post<ICreatePaymentRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};
