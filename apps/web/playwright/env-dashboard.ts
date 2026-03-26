/// <reference types="node" />

import * as z from "zod/v4";
import { E2E_DASHBOARD } from "./e2e-dashboard-constants";

const envSchema = z.object({
  E2E_DASHBOARD_EMAIL: z.email().default(E2E_DASHBOARD.email),
  E2E_DASHBOARD_PASSWORD: z.string().min(8).default(E2E_DASHBOARD.password),
});

const env = envSchema.parse(process.env);

export { env };
