import { Link } from "@prisma/client";
import { expect } from "vitest";

export const expectedLink: Partial<Link> & {
  tagId: string | null;
  tags: [];
} = {
  id: expect.any(String),
  key: expect.any(String),
  domain: "dub.sh",
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
  tagId: null, // backwards compatibility
  comments: null,
  tags: [],
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  expiredUrl: null,
  externalId: null,
};
