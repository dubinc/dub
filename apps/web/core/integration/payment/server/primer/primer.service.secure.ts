"use server";

import { exec } from "child_process";
import { promisify } from "util";
import {
  primerHeaders,
  primerHeadersReadonly,
  primerUrl,
} from "./primer.constant";
import {
  ICreatePrimerClientPaymentBody,
  ICreatePrimerClientPaymentRes,
  ICreatePrimerClientSessionBody,
  ICreatePrimerClientSessionRes,
  IGetPrimerClientPaymentInfoBody,
  IGetPrimerClientPaymentInfoRes,
  IGetPrimerPaymentMethodTokenBody,
  IGetPrimerPaymentMethodTokenRes,
  IPrimerPaymentMethod,
  IUpdatePrimerClientSessionBody,
  IUpdatePrimerClientSessionRes,
} from "./primer.interface";

import { debugUtil } from "core/util";

const execAsync = promisify(exec);

/**
 * SecureHttpClient - HTTP client using curl to bypass TLS fingerprinting
 *
 * Problem: Primer API uses TLS fingerprinting to detect and block Node.js requests.
 * Solution: Use system curl which has different TLS signature that Primer accepts.
 */
class SecureHttpClient {
  private buildCurlCommand(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): string {
    const headerArgs = Object.entries(headers)
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
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        throw new Error(`Curl error: ${stderr}`);
      }

      return JSON.parse(stdout);
    } catch (error: any) {
      if (error.message?.includes("JSON")) {
        throw new Error("Invalid JSON response from API");
      }
      throw error;
    }
  }

  async get<T>(url: string, headers: Record<string, string>): Promise<T> {
    const command = this.buildCurlCommand(url, "GET", headers);
    return this.executeRequest<T>(command);
  }

  async post<T>(
    url: string,
    headers: Record<string, string>,
    body: any,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "POST", headers, body);
    return this.executeRequest<T>(command);
  }

  async patch<T>(
    url: string,
    headers: Record<string, string>,
    body: any,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "PATCH", headers, body);
    return this.executeRequest<T>(command);
  }
}

const secureHttp = new SecureHttpClient();

// create primer client session (secure version)
export const createPrimerClientSession = async (
  body: ICreatePrimerClientSessionBody,
) => {
  try {
    const data = await secureHttp.post<ICreatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      primerHeaders,
      body,
    );

    debugUtil({ text: "createPrimerClientSessionSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "createPrimerClientSessionSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// update primer client session (secure version)
export const updatePrimerClientSession = async (
  body: IUpdatePrimerClientSessionBody,
) => {
  try {
    const data = await secureHttp.patch<IUpdatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      primerHeaders,
      body,
    );

    debugUtil({ text: "updatePrimerClientSessionSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "updatePrimerClientSessionSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// get primer payment method token (secure version)
export const getPrimerPaymentMethodToken = async (
  body: IGetPrimerPaymentMethodTokenBody,
) => {
  try {
    const { data } = await secureHttp.get<IGetPrimerPaymentMethodTokenRes>(
      `${primerUrl}/payment-instruments?customer_id=${body.customerId}`,
      primerHeaders,
    );

    const cloneData: IPrimerPaymentMethod[] = structuredClone(data);

    // @description: If there are multiple saved payment methods, sort them by createdAt in descending order and take latest one
    if (data?.length > 1) {
      cloneData.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }

    debugUtil({ text: "getPrimerPaymentMethodTokensSecure", value: cloneData });
    debugUtil({
      text: "getPrimerPaymentMethodTokenSecure",
      value: cloneData?.at(0)?.token,
    });

    return cloneData?.at(0)?.token;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "getPrimerPaymentMethodTokenSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};

// get primer payment method info (secure version)
export const getPrimerPaymentInfo = async (
  body: IGetPrimerClientPaymentInfoBody,
) => {
  try {
    const data = await secureHttp.get<IGetPrimerClientPaymentInfoRes>(
      `${primerUrl}/payments/${body.paymentId}`,
      primerHeadersReadonly,
    );

    debugUtil({ text: "getPrimerPaymentInfoSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({ text: "getPrimerPaymentInfoSecure error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// create primer client payment (secure version)
export const createPrimerClientPayment = async (
  body: ICreatePrimerClientPaymentBody,
) => {
  try {
    const data = await secureHttp.post<ICreatePrimerClientPaymentRes>(
      `${primerUrl}/payments`,
      primerHeaders,
      body,
    );

    debugUtil({ text: "createPrimerClientPaymentSecure", value: data });

    return data;
  } catch (error: any) {
    const errorMsg = error?.message || "Something went wrong";

    debugUtil({
      text: "createPrimerClientPaymentSecure error",
      value: errorMsg,
    });
    throw new Error(errorMsg);
  }
};
