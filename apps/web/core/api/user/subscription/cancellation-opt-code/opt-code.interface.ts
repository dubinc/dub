import { IDataRes } from "core/interfaces/common.interface";

export interface IEmailConfirmationData {
  confirmationUrl: string;
  user_id?: string;
}

export interface IEmailConfirmationRes extends IDataRes {
  data?: IEmailConfirmationData;
}

export interface IEmailVerifyRes extends IDataRes {
  data?: {
    user_id: string;
  };
}
