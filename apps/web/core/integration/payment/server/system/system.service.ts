import ky from "ky";
import { systemHeaders, systemUrl } from "./system.constant";
import {
  ICheckSystemSubscriptionStatusBody,
  ICreateSystemTokenOnboardingBody,
  ICreateSystemTokenOnboardingRes,
  IGetSystemPaymentErrorBody,
  IGetSystemPaymentErrorRes,
  IGetSystemUpgradePaymentIdRes,
  IGetSystemUserDataBody,
  IGetSystemUserDataRes,
  IGetSystemUserProcessorRes,
  IUpdateSystemPaymentMethodBody,
  IUpdateSystemSubscriptionBody,
  IUpdateSystemSubscriptionRes,
  IUpdateUserSystemDataBody,
} from "./system.interface";

import { debugUtil } from "core/util";
import { compareDesc } from "date-fns/compareDesc";
import { parseISO } from "date-fns/parseISO";
import { IDataRes } from "../../../../interfaces/common.interface.ts";

const activeStatuses = ["active", "trial", "scheduled_for_cancellation"];

// create system token onboarding
export const createSystemTokenOnboarding = async (
  body: ICreateSystemTokenOnboardingBody,
) => {
  try {
    const res = await ky.post<ICreateSystemTokenOnboardingRes>(
      `${systemUrl}/tokens/onboarding/successful`,
      {
        headers: systemHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "createSystemTokenOnboarding", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "createSystemTokenOnboarding error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// update system subscription status
export const updateSystemSubscriptionStatus = async (
  id: string,
  body: IUpdateSystemSubscriptionBody,
) => {
  try {
    const res = await ky.post<IUpdateSystemSubscriptionRes>(
      `${systemUrl}/subscriptions/${id}/plan/update`,
      {
        headers: systemHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "updateSystemSubscriptionStatus", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({
      text: "updateSystemSubscriptionStatus error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// get system user data by email
export const getSystemUserDataByEmail = async (
  body: IGetSystemUserDataBody,
) => {
  try {
    const res = await ky.get<IGetSystemUserDataRes>(
      `${systemUrl}/subscriptions?email=${body.email}`,
      {
        headers: systemHeaders,
      },
    );
    const data = await res.json();

    debugUtil({
      text: "getSystemUserDataByEmail",
      value: data,
    });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "checkSystemSubscriptionStatus error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// check system subscription status
export const checkSystemSubscriptionStatus = async (
  body: ICheckSystemSubscriptionStatusBody,
) => {
  try {
    const data = await getSystemUserDataByEmail(body);

    const subscription =
      data?.subscriptions?.length > 1
        ? [...data.subscriptions].sort((a, b) =>
            compareDesc(parseISO(a.createdAt), parseISO(b.createdAt)),
          )[0]
        : data?.subscriptions?.[0];

    if (!subscription) {
      return {
        isSubscribed: false,
        isCancelled: false,
        isScheduledForCancellation: false,
        hasAccessToApp: false,
        subscriptionId: null,
        status: null,
        nextBillingDate: null,
        isDunning: false,
      };
    }

    const nextBillingDate = subscription?.nextBillingDate;
    const isSubscribed = activeStatuses.includes(subscription.status);
    const isCancelled = subscription?.status === "cancelled";
    const isScheduledForCancellation =
      subscription?.status === "scheduled_for_cancellation";
    const hasAccessToApp = isSubscribed || isScheduledForCancellation;

    debugUtil({
      text: "checkSystemSubscriptionStatus",
      value: {
        isSubscribed,
        subscriptionId: subscription?.id,
        subscription,
      },
    });

    return {
      isSubscribed,
      isCancelled,
      isScheduledForCancellation,
      hasAccessToApp,
      subscriptionId: subscription?.id,
      status: subscription.status,
      nextBillingDate,
      isDunning: subscription.status === "dunning",
    };
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "checkSystemSubscriptionStatus error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// get system payment error
export const getSystemPaymentError = async (
  body: IGetSystemPaymentErrorBody,
) => {
  try {
    const res = await ky.get<IGetSystemPaymentErrorRes>(
      `${systemUrl}/payments/${body.id}/error`,
      {
        headers: systemHeaders,
      },
    );
    const data = await res.json();

    debugUtil({ text: "systemGetPaymentError", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "systemGetPaymentError error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// get system upgrade payment id
export const getSystemSubscriptionUpgradePaymentId = async (
  upgradeId: string,
) => {
  try {
    const res = await ky.get<IGetSystemUpgradePaymentIdRes>(
      `${systemUrl}/subscriptions/plan-change/${upgradeId}/payment-id`,
      {
        headers: systemHeaders,
        timeout: 20000,
      },
    );
    const data = await res.json();

    debugUtil({ text: "getSystemSubscriptionUpgradePaymentId", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({
      text: "getSystemSubscriptionUpgradePaymentId error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

export const updateSystemSubscriptionPaymentMethod = async (
  body: IUpdateSystemPaymentMethodBody,
) => {
  try {
    const res = await ky.post<IDataRes>(
      `${systemUrl}/tokens/card-update/successful`,
      {
        headers: systemHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "updateSystemSubscriptionPaymentMethod", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({
      text: "updateSystemSubscriptionPaymentMethod error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

export const updateUserSystemData = async (
  id: string,
  body: IUpdateUserSystemDataBody,
) => {
  try {
    const res = await ky.put<IDataRes>(`${systemUrl}/users/${id}`, {
      headers: systemHeaders,
      json: body,
    });
    const data = await res.json();

    debugUtil({ text: "updateUserSystemData", value: data });
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "updateUserSystemData error", value: errorMsg });
  }
};

export const getSystemUserProcessor = async (
  customerId: string,
  retries: number = 20,
) => {
  if (retries <= 0) {
    return {};
  }

  try {
    const res = await ky.get<IGetSystemUserProcessorRes>(
      `${systemUrl}/users/${customerId}/metadata`,
      {
        headers: systemHeaders,
      },
    );
    const data = await res.json();

    debugUtil({ text: "getSystemUserProcessor", value: data });

    return data?.metadata;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "getSystemUserProcessor error", value: errorMsg });

    setTimeout(() => {
      getSystemUserProcessor(customerId, retries - 1);
    }, 1000);
  }
};
