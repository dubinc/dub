import { CreateEmailOptions } from "resend";

export interface ResendEmailOptions
  extends Omit<CreateEmailOptions, "to" | "from"> {
  to: string;
  from?: string;
  variant?: "primary" | "notifications" | "marketing";
  unsubscribeUrl?: string; // Custom unsubscribe URL for List-Unsubscribe header
}

export type ResendBulkEmailOptions = ResendEmailOptions[];

export type { GetDomainResponseSuccess } from "resend";
