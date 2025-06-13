"use server";

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
import { secureHttpClient } from "../secure-http-client";

// create primer client session (secure version)
export const createPrimerClientSession = async (
  body: ICreatePrimerClientSessionBody,
) => {
  try {
    const data = await secureHttpClient.post<ICreatePrimerClientSessionRes>(
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
    const data = await secureHttpClient.patch<IUpdatePrimerClientSessionRes>(
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
    const { data } = await secureHttpClient.get<IGetPrimerPaymentMethodTokenRes>(
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
    const data = await secureHttpClient.get<IGetPrimerClientPaymentInfoRes>(
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
    const data = await secureHttpClient.post<ICreatePrimerClientPaymentRes>(
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
