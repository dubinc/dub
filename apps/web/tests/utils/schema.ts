import z from "@/lib/zod";
import { LinkSchema as LinkSchemaOld } from "@/lib/zod/schemas/links";
import { Link, Project, Tag } from "@dub/prisma/client";
import { expect } from "vitest";

export const LinkSchema = LinkSchemaOld.extend({
  identifier: z.null(),
});

export const expectedLink: Partial<Link> & {
  identifier: null;
  tagId: string | null;
  tags: [];
  webhookIds: string[];
} = {
  id: expect.any(String),
  key: expect.any(String),
  domain: "dub.sh",
  shortLink: expect.any(String),
  trackConversion: false,
  archived: false,
  expiresAt: null,
  password: null,
  proxy: false,
  title: null,
  description: null,
  image: null,
  video: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  rewrite: false,
  doIndex: false,
  ios: null,
  android: null,
  geo: null,
  publicStats: false,
  clicks: 0,
  lastClicked: null,
  leads: 0,
  sales: 0,
  saleAmount: 0,
  identifier: null, // backwards compatibility
  tagId: null, // backwards compatibility
  comments: null,
  tags: [],
  webhookIds: [],
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  expiredUrl: null,
  externalId: null,
  programId: null,
  tenantId: null,
};

export const expectedTag: Partial<Tag> = {
  id: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

export const expectedWorkspace: Partial<Project> = {
  id: expect.any(String),
  name: expect.any(String),
  slug: expect.any(String),
  logo: expect.any(String),

  plan: expect.any(String),
  stripeId: expect.any(String),
  billingCycleStart: expect.any(Number),
  inviteCode: expect.any(String),

  usage: expect.any(Number),
  usageLimit: expect.any(Number),
  linksUsage: expect.any(Number),
  linksLimit: expect.any(Number),
  salesUsage: expect.any(Number),
  salesLimit: expect.any(Number),
  domainsLimit: expect.any(Number),
  tagsLimit: expect.any(Number),
  usersLimit: expect.any(Number),

  createdAt: expect.any(String),
};
