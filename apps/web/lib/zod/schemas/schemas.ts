import { z } from "zod";

export const fraudEventContext = z.object({
  program: z.object({
    id: z.string(),
  }),
  partner: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  customer: z.object({
    id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  commission: z.object({
    id: z.string().nullable().optional(),
  }),
  link: z.object({
    id: z.string().nullable().optional(),
  }),
  click: z.object({
    url: z.string().nullable(),
    referer: z.string().nullable(),
    referer_url: z.string().nullable().optional(),
  }),
  event: z.object({
    id: z.string(),
  }),
});
