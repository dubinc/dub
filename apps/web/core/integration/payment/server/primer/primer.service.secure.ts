"use server";

import { edgeHttpClient } from "../secure-http-client.ts";
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

// create primer client session (secure version)
export const createPrimerClientSession = async (
  body: ICreatePrimerClientSessionBody,
) => {
  try {
    const data = await edgeHttpClient<ICreatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      "POST",
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
    const data = await edgeHttpClient<IUpdatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      "PATCH",
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
    const { data } = await edgeHttpClient<IGetPrimerPaymentMethodTokenRes>(
      `${primerUrl}/payment-instruments?customer_id=${body.customerId}`,
      "GET",
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
    const data = await edgeHttpClient<IGetPrimerClientPaymentInfoRes>(
      `${primerUrl}/payments/${body.paymentId}`,
      "GET",
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
    const data = await edgeHttpClient<ICreatePrimerClientPaymentRes>(
      `${primerUrl}/payments`,
      "POST",
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
