import { TPaymentPlan } from "core/integration/payment/config";
import { ICreatePrimerClientPaymentRes } from "core/integration/payment/server";
import { IDataRes } from "core/interfaces/common.interface.ts";

export interface ICreateSessionBody {
  email?: string;
  metadata?: { [key: string]: string | number | boolean | undefined };
}

export interface ICreateSessionRes extends IDataRes {
  data?: {
    clientToken: string;
  };
}

export interface IUpdateSessionBody {
  paymentPlan: TPaymentPlan;
  email?: string;
  metadata?: { [key: string]: string | number | boolean | undefined };
}

export interface IUpdateSessionRes extends IDataRes {
  data?: {
    clientToken: string;
    clientTokenExpirationDate: string;
  };
}

export interface ICreatePaymentBody extends Partial<ICreateSessionBody> {
  paymentPlan: TPaymentPlan;
}

export interface ICreatePaymentRes extends IDataRes {
  data?: {
    paymentId: string;
    status: ICreatePrimerClientPaymentRes["status"];
  } | null;
}
