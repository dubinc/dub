import { ICustomerBody } from "core/integration/payment/config";
import { IDataRes } from "core/interfaces/common.interface.ts";

export interface IUserProfileRes extends IDataRes {
  data?: ICustomerBody | null;
}
