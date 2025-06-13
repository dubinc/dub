import ky from "ky";
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

// create primer client session
export const createPrimerClientSession = async (
  body: ICreatePrimerClientSessionBody,
) => {
  try {
    const res = await ky.post<ICreatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      {
        headers: primerHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "createPrimerClientSession", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "createPrimerClientSession error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// update primer client session
export const updatePrimerClientSession = async (
  body: IUpdatePrimerClientSessionBody,
) => {
  try {
    const res = await ky.patch<IUpdatePrimerClientSessionRes>(
      `${primerUrl}/client-session`,
      {
        headers: primerHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "updatePrimerClientSession", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "updatePrimerClientSession error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// get primer payment method token
export const getPrimerPaymentMethodToken = async (
  body: IGetPrimerPaymentMethodTokenBody,
) => {
  try {
    const res = await ky.get<IGetPrimerPaymentMethodTokenRes>(
      `${primerUrl}/payment-instruments?customer_id=${body.customerId}`,
      { headers: primerHeaders },
    );
    const { data } = await res.json();

    const cloneData: IPrimerPaymentMethod[] = structuredClone(data);

    // @description: If there are multiple saved payment methods, sort them by createdAt in descending order and take latest one
    if (data?.length > 1) {
      cloneData.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }

    debugUtil({ text: "getPrimerPaymentMethodTokens", value: cloneData });
    debugUtil({
      text: "getPrimerPaymentMethodToken",
      value: cloneData?.at(0)?.token,
    });

    return cloneData?.at(0)?.token;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "getPrimerPaymentMethodToken error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// get primer payment method info
export const getPrimerPaymentInfo = async (
  body: IGetPrimerClientPaymentInfoBody,
) => {
  try {
    const res = await ky.get<IGetPrimerClientPaymentInfoRes>(
      `${primerUrl}/payments/${body.paymentId}`,
      {
        headers: primerHeadersReadonly,
      },
    );
    const data = await res.json();

    debugUtil({ text: "getPrimerPaymentInfo", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "getPrimerPaymentInfo error", value: errorMsg });
    throw new Error(errorMsg);
  }
};

// create primer client payment
export const createPrimerClientPayment = async (
  body: ICreatePrimerClientPaymentBody,
) => {
  try {
    const res = await ky.post<ICreatePrimerClientPaymentRes>(
      `${primerUrl}/payments`,
      {
        headers: primerHeaders,
        json: body,
      },
    );
    const data = await res.json();

    debugUtil({ text: "createPrimerClientPayment", value: data });

    return data;
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "createPrimerClientPayment error", value: errorMsg });
    throw new Error(errorMsg);
  }
};
