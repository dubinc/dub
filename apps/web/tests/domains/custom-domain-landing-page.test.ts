import {
  filterLandingPageLinks,
  getLandingPageCopy,
} from "@/lib/custom-domain-landing-page";
import { describe, expect, test } from "vitest";

describe("custom-domain landing page helpers", () => {
  test("filters landing page links to active cloaked links only", () => {
    const now = new Date("2026-03-18T00:00:00.000Z");

    const links = [
      {
        id: "link_1",
        domain: "go.acme.com",
        key: "summer",
        url: "https://acme.com/summer",
        shortLink: "https://go.acme.com/summer",
        title: "Summer Launch",
        description: null,
        image: null,
        clicks: 10,
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        archived: false,
        rewrite: true,
        expiresAt: null,
        disabledAt: null,
        password: null,
      },
      {
        id: "link_2",
        domain: "go.acme.com",
        key: "private",
        url: "https://acme.com/private",
        shortLink: "https://go.acme.com/private",
        title: null,
        description: null,
        image: null,
        clicks: 99,
        createdAt: new Date("2026-03-11T00:00:00.000Z"),
        archived: false,
        rewrite: true,
        expiresAt: null,
        disabledAt: null,
        password: "secret",
      },
      {
        id: "link_3",
        domain: "go.acme.com",
        key: "expired",
        url: "https://acme.com/expired",
        shortLink: "https://go.acme.com/expired",
        title: null,
        description: null,
        image: null,
        clicks: 5,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        archived: false,
        rewrite: true,
        expiresAt: new Date("2026-03-17T00:00:00.000Z"),
        disabledAt: null,
        password: null,
      },
      {
        id: "link_4",
        domain: "go.acme.com",
        key: "visible",
        url: "https://acme.com/visible",
        shortLink: "https://go.acme.com/visible",
        title: "Visible",
        description: null,
        image: null,
        clicks: 50,
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        archived: false,
        rewrite: true,
        expiresAt: null,
        disabledAt: null,
        password: null,
      },
      {
        id: "link_5",
        domain: "go.acme.com",
        key: "not-cloaked",
        url: "https://acme.com/plain",
        shortLink: "https://go.acme.com/plain",
        title: null,
        description: null,
        image: null,
        clicks: 60,
        createdAt: new Date("2026-03-08T00:00:00.000Z"),
        archived: false,
        rewrite: false,
        expiresAt: null,
        disabledAt: null,
        password: null,
      },
    ];

    expect(filterLandingPageLinks(links, now).map((link) => link.id)).toEqual([
      "link_4",
      "link_1",
    ]);
  });

  test("uses root link copy when available", () => {
    expect(
      getLandingPageCopy({
        domain: "go.acme.com",
        rootLink: {
          title: "Acme Resources",
          description: "Browse the latest campaign links.",
          image: "https://assets.example.com/cover.png",
          video: null,
        },
        featuredLinks: [],
      }),
    ).toMatchObject({
      title: "Acme Resources",
      description: "Browse the latest campaign links.",
      image: "https://assets.example.com/cover.png",
      hasCustomContent: true,
    });
  });
});
