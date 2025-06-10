import { apiInstance } from "../../../lib/rest-api";
import {
  ICheckSubscriptionStatusRes,
  ICreateSubscriptionBody,
  ICreateSubscriptionRes,
  IUpdateSubscriptionBody,
  IUpdateSubscriptionPaymentMethodBody,
  IUpdateSubscriptionPaymentMethodRes,
  IUpdateSubscriptionRes,
} from "./subscription.interface";

// api
export const createSubscriptionFetcher = async (
  url: string,
  { arg }: { arg: ICreateSubscriptionBody },
) => {
  const res = await apiInstance.post<ICreateSubscriptionRes>(url, {
    json: arg,
    throwHttpErrors: false,
    timeout: 60000,
  });
  return await res.json();
};
export const updateSubscriptionFetcher = async (
  url: string,
  { arg }: { arg: IUpdateSubscriptionBody },
) => {
  const res = await apiInstance.post<IUpdateSubscriptionRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};
export const checkSubscriptionStatusFetcher = async (url: string) => {
  const res = await apiInstance.get<ICheckSubscriptionStatusRes>(url, {
    throwHttpErrors: false,
  });
  return await res.json();
};
export const updateSubscriptionPaymentMethod = async (
  url: string,
  { arg }: { arg: IUpdateSubscriptionPaymentMethodBody },
) => {
  const res = await apiInstance.post<IUpdateSubscriptionPaymentMethodRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};
