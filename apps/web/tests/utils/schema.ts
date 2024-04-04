import { TagProps } from "@/lib/types";
import { Link } from "@prisma/client";
import { expect, test } from "vitest";

export const expectedLink: Partial<Link> = {
  id: expect.any(String),
  key: expect.any(String),
  archived: false,
  expiresAt: null,
  password: null,
  proxy: false,
  title: null,
  description: null,
  image: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  rewrite: false,
  ios: null,
  android: null,
  geo: null,
  publicStats: false,
  clicks: 0,
  lastClicked: null,
  checkDisabled: false,
  tagId: null,
  comments: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};
