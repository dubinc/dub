"use server";

import { exec } from "child_process";
import { promisify } from "util";
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

const execAsync = promisify(exec);

const activeStatuses = ["active", "trial", "scheduled_for_cancellation"];

/**
 * SecureHttpClient - HTTP client using curl to bypass TLS fingerprinting
 *
 * Problem: System API uses TLS fingerprinting to detect and block Node.js requests.
 * Solution: Use system curl which has different TLS signature that System accepts.
 */
class SecureHttpClient {
  private sanitizeHeaders(
    headers: Record<string, string | undefined>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private buildCurlCommand(
    url: string,
    method: string,
    headers: Record<string, string | undefined>,
    body?: any,
  ): string {
    const sanitizedHeaders = this.sanitizeHeaders(headers);
    const headerArgs = Object.entries(sanitizedHeaders)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(" ");

    let command = `curl -s -X ${method} ${headerArgs}`;

    if (body) {
      const jsonBody = JSON.stringify(body).replace(/"/g, '\\"');
      command += ` -d "${jsonBody}"`;
    }

    command += ` "${url}"`;
    return command;
  }

  private async executeRequest<T>(command: string): Promise<T> {
    try {
      console.log("🔍 [SecureHttpClient] Executing curl command:", command);

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.log("🔍 [SecureHttpClient] Curl stderr:", stderr);
        throw new Error(`Curl error: ${stderr}`);
      }

      console.log("🔍 [SecureHttpClient] Curl stdout:", stdout);

      const parsedData = JSON.parse(stdout);
      console.log("🔍 [SecureHttpClient] Parsed response:", parsedData);

      return parsedData;
    } catch (error: any) {
      console.log("🔍 [SecureHttpClient] Execute request error:", {
        error: error.message,
        isJsonError: error.message?.includes("JSON"),
      });

      if (error.message?.includes("JSON")) {
        throw new Error("Invalid JSON response from API");
      }
      throw error;
    }
  }

  async get<T>(
    url: string,
    headers: Record<string, string | undefined>,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "GET", headers);
    return this.executeRequest<T>(command);
  }

  async post<T>(
    url: string,
    headers: Record<string, string | undefined>,
    body: any,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "POST", headers, body);
    return this.executeRequest<T>(command);
  }

  async put<T>(
    url: string,
    headers: Record<string, string | undefined>,
    body: any,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "PUT", headers, body);
    return this.executeRequest<T>(command);
  }
}

const secureHttp = new SecureHttpClient();

// create system token onboarding (secure version)
export const createSystemTokenOnboarding = async (
  body: ICreateSystemTokenOnboardingBody,
) => {
  try {
    console.log("🔍 [SystemSecure] createSystemTokenOnboarding input:", {
      userEmail: body.user?.email,
      hasPaymentMethodToken: !!body.paymentMethodToken,
      bodyKeys: Object.keys(body),
      subscriptionKeys: body.subscription
        ? Object.keys(body.subscription)
        : "no subscription",
    });

    const data = await secureHttp.post<ICreateSystemTokenOnboardingRes>(
      `${systemUrl}/tokens/onboarding/successful`,
      systemHeaders,
      body,
    );

    console.log("🔍 [SystemSecure] createSystemTokenOnboarding response:", {
      data,
      hasSubscription: !!data?.subscription,
      subscriptionId: data?.subscription?.id,
      dataKeys: data ? Object.keys(data) : "undefined",
    });

    // Check if response contains error
    if (data && "error" in data) {
      console.log("🔍 [SystemSecure] API returned error response:", data.error);
      throw new Error(data.error as string);
    }

    debugUtil({ text: "createSystemTokenOnboardingSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    console.log("🔍 [SystemSecure] createSystemTokenOnboarding error:", {
      error: errorMsg,
      fullError: error,
    });

    debugUtil({
      text: "createSystemTokenOnboardingSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// update system subscription status (secure version)
export const updateSystemSubscriptionStatus = async (
  id: string,
  body: IUpdateSystemSubscriptionBody,
) => {
  try {
    const data = await secureHttp.post<IUpdateSystemSubscriptionRes>(
      `${systemUrl}/subscriptions/${id}/plan/update`,
      systemHeaders,
      body,
    );

    debugUtil({ text: "updateSystemSubscriptionStatusSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "updateSystemSubscriptionStatusSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// get system user data by email (secure version)
export const getSystemUserDataByEmail = async (
  body: IGetSystemUserDataBody,
) => {
  try {
    const data = await secureHttp.get<IGetSystemUserDataRes>(
      `${systemUrl}/subscriptions?email=${body.email}`,
      systemHeaders,
    );

    debugUtil({
      text: "getSystemUserDataByEmailSecure",
      value: data,
    });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "getSystemUserDataByEmailSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// check system subscription status (secure version)
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

    const isSubscribed = activeStatuses.includes(subscription.status);

    debugUtil({
      text: "checkSystemSubscriptionStatusSecure",
      value: {
        isSubscribed,
        subscriptionId: subscription?.id,
        subscription,
      },
    });

    return {
      isSubscribed,
      subscriptionId: subscription?.id,
      status: subscription.status,
    };
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "checkSystemSubscriptionStatusSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// get system payment error (secure version)
export const getSystemPaymentError = async (
  body: IGetSystemPaymentErrorBody,
) => {
  try {
    const data = await secureHttp.get<IGetSystemPaymentErrorRes>(
      `${systemUrl}/payments/${body.id}/error`,
      systemHeaders,
    );

    debugUtil({ text: "systemGetPaymentErrorSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({ text: "systemGetPaymentErrorSecure error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// get system upgrade payment id (secure version)
export const getSystemSubscriptionUpgradePaymentId = async (
  upgradeId: string,
) => {
  try {
    const data = await secureHttp.get<IGetSystemUpgradePaymentIdRes>(
      `${systemUrl}/subscriptions/plan-change/${upgradeId}/payment-id`,
      systemHeaders,
    );

    debugUtil({
      text: "getSystemSubscriptionUpgradePaymentIdSecure",
      value: data,
    });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "getSystemSubscriptionUpgradePaymentIdSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// update system subscription payment method (secure version)
export const updateSystemSubscriptionPaymentMethod = async (
  body: IUpdateSystemPaymentMethodBody,
) => {
  try {
    const data = await secureHttp.post<IDataRes>(
      `${systemUrl}/tokens/card-update/successful`,
      systemHeaders,
      body,
    );

    debugUtil({
      text: "updateSystemSubscriptionPaymentMethodSecure",
      value: data,
    });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "updateSystemSubscriptionPaymentMethodSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// update user system data (secure version)
export const updateUserSystemData = async (
  id: string,
  body: IUpdateUserSystemDataBody,
) => {
  try {
    const data = await secureHttp.put<IDataRes>(
      `${systemUrl}/users/${id}`,
      systemHeaders,
      body,
    );

    debugUtil({ text: "updateUserSystemDataSecure", value: data });
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({ text: "updateUserSystemDataSecure error", value: errorMsg });
  }
};

// get system user processor (secure version)
export const getSystemUserProcessor = async (
  customerId: string,
  retries: number = 20,
) => {
  if (retries <= 0) {
    return {};
  }

  try {
    const data = await secureHttp.get<IGetSystemUserProcessorRes>(
      `${systemUrl}/users/${customerId}/metadata`,
      systemHeaders,
    );

    debugUtil({ text: "getSystemUserProcessorSecure", value: data });

    return data?.metadata;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({ text: "getSystemUserProcessorSecure error", value: errorMsg });

    setTimeout(() => {
      getSystemUserProcessor(customerId, retries - 1);
    }, 1000);
  }
};
