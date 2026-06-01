export const PASSWORD = "Password123";

export const PARTNER = {
  name: "Partner 1",
  email: "partner+1@dub-internal-test.com",
  country: "US",
} as const;

export const PARTNER_USERS = {
  owner: {
    email: "partner+owner@dub-internal-test.com",
    name: "Partner Owner",
    programAccess: "all",
  },
  member: {
    email: "partner+member@dub-internal-test.com",
    name: "Partner Member",
    programAccess: "restricted",
  },
  viewer: {
    email: "partner+viewer@dub-internal-test.com",
    name: "Partner Viewer",
    programAccess: "all",
  },
} as const;

export const PARTNER_LINKS = {
  acme: [
    {
      key: "acme-link-1",
      url: "https://acme.com",
    },
    {
      key: "acme-link-2",
      url: "https://acme.com",
    },
  ],
  example: [
    {
      key: "example-link-1",
      url: "https://example.com",
    },
    {
      key: "example-link-2",
      url: "https://example.com",
    },
  ],
} as const;

export const PARTNER_PROGRAMS = ["acme", "example"];
