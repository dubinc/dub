import { apiInstance } from "core/lib/rest-api";
import { IEmailConfirmationRes, IEmailVerifyRes } from "./opt-code.interface";

// api
export const verifyOtpCodeFetcher = async (
  url: string,
  { arg }: { arg: { confirm_code: string; user_email: string } },
): Promise<IEmailVerifyRes> => {
  const res = await apiInstance.post<IEmailVerifyRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });
  return await res.json();
};

export const sendOtpCodeFetcher = async (
  url: string,
  { arg }: { arg: { email: string } },
): Promise<IEmailConfirmationRes> => {
  const res = await apiInstance.post<IEmailConfirmationRes>(url, {
    json: arg,
    throwHttpErrors: false,
  });

  return await res.json();
};
