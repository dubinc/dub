import {
  WEBHOOK_SECRET_LENGTH,
  WEBHOOK_SECRET_PREFIX,
} from "@/lib/webhook/constants";
import { createToken } from "../api/oauth/utils";

export const createWebhookSecret = () => {
  return createToken({
    prefix: WEBHOOK_SECRET_PREFIX,
    length: WEBHOOK_SECRET_LENGTH,
  });
};
