export const E2E_USER_ID = "clxz1q7c7000hbqx5ckv4r82h";
export const E2E_USER_ID_MEMBER = "user_1KAERYAJ10MDM56EB9XPX4ZZ8"; // for member user tests
export const E2E_WORKSPACE_ID = "ws_clrei1gld0002vs9mzn93p8ik";

export const E2E_LINK = {
  domain: "dub.sh",
  key: "test-click-tracking",
  url: "https://github.com/dubinc",
};

export const E2E_TRACK_CLICK_HEADERS = {
  referer: "https://dub.co",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

export const E2E_TAG = {
  id: "clvkopm8b0009nf98azsp9epk",
  name: "E2E Tests (DO NOT DELETE)",
  color: "red",
};

export const E2E_TAG_2 = {
  id: "tag_sfaXFOt0kFLtEV3Z5wtywbTl",
  name: "E2E Tests 2 (DO NOT DELETE)",
  color: "blue",
};

export const E2E_CUSTOMER_ID = "cm25onzuv0001s1bbxchrc0ae";
export const E2E_CUSTOMER_EXTERNAL_ID = "cus_jTrfVKYN3Buc3F80JoqBiY0g";
export const E2E_WEBHOOK_ID = "wh_MHR7sZXXtZ7keBaNYZ30rQ0v";

// Folders specific
export const E2E_WRITE_ACCESS_FOLDER_ID = "fold_1JP8FMYP08RGJKJB3S4DNYH13"; // Folder with write access
export const E2E_READ_ONLY_FOLDER_ID = "fold_1JP8FN462884CA6JJCVPAHAD4"; // Folder with read-only access
export const E2E_NO_ACCESS_FOLDER_ID = "fold_1JRZXGNNYWDA5QTT8CVDB3M23"; // Folder with no access
export const E2E_READ_ONLY_FOLDER_LINK_ID = "link_1KAESR5Z733716RTT4E1RSTW6"; // A link in read-only folder
export const E2E_NO_ACCESS_FOLDER_LINK_ID = "link_1KAESQ2Z6Q35WDV5NGSEVPFB0"; // A link in no access folder

// Rewards specific
export const E2E_CUSTOMER_EXTERNAL_ID_2 = "cus_pqc8qRtofpu6ZqvutyNDGAU2";
export const E2E_SALE_REWARD = {
  id: "rw_1JYPP77NNDG6TVPAJDKNZREQN",
  event: "sale",
  type: "flat",
  amountInCents: 1000,
  modifiers: [
    {
      type: "flat",
      operator: "AND",
      conditions: [
        {
          value: "premiumProductId",
          entity: "sale",
          operator: "equals_to",
          attribute: "productId",
        },
      ],
      maxDuration: null,
      amountInCents: 3000,
    },
    {
      type: "flat",
      operator: "AND",
      conditions: [
        {
          value: 15000,
          entity: "sale",
          operator: "greater_than",
          attribute: "amount",
        },
      ],
      maxDuration: null,
      amountInCents: 5000,
    },
    {
      type: "percentage",
      operator: "AND",
      conditions: [
        {
          value: "US",
          entity: "customer",
          operator: "equals_to",
          attribute: "country",
        },
      ],
      maxDuration: null,
      amountInPercentage: 10,
    },
    {
      type: "flat",
      operator: "AND",
      conditions: [
        {
          value: "CA",
          entity: "customer",
          operator: "equals_to",
          attribute: "country",
        },
      ],
      maxDuration: null,
      amountInCents: 50,
    },
  ],
};

export const E2E_LEAD_REWARD = {
  id: "rw_1K82ESAT4YPY0STR20GKXZ7DR",
  event: "lead",
  type: "flat",
  amountInCents: 100,
  modifiers: [
    {
      type: "flat",
      operator: "AND",
      conditions: [
        {
          value: "US",
          entity: "customer",
          operator: "equals_to",
          attribute: "country",
        },
      ],
      maxDuration: null,
      amountInCents: 200,
    },
    {
      type: "flat",
      operator: "AND",
      conditions: [
        {
          value: "US",
          entity: "partner",
          operator: "equals_to",
          attribute: "country",
        },
      ],
      maxDuration: 0,
      amountInCents: 300,
    },
  ],
};

// Discounts specific
export const E2E_CUSTOMER_WITH_DISCOUNT = {
  id: "cus_pNGuZQJrAKjzttQTZMI4a46y",
  externalId: "cus_PowZhxHqUvN8MSdszEElqsUx",
  email: "rural.yellow.takin@example.com",
};

export const E2E_DISCOUNT = {
  id: "disc_1K2E253814K7TA6YRKA86XMX5",
  amount: 30,
  type: "percentage",
  maxDuration: 3,
  couponId: "XZuejd0Q",
  couponTestId: "2NMXz81x",
  description: null,
};

// Program
export const E2E_PROGRAM = {
  id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
  domain: "getacme.link",
};

export const E2E_PARTNER = {
  id: "pn_H4TB2V5hDIjpqB7PwrxESoY3",
  email: "steven@dub.co",
  tenantId: "4149092f-7265-4002-98d9-da9f8e67e1fb",
};

export const E2E_PARTNER_GROUP = {
  id: "grp_1K2E25381GVMG7HHM057TB92F",
  url: "https://acme.dub.sh/",
};

export const E2E_PARTNERS = [
  {
    id: "pn_NNG3YjwhLhA7nCZSaXeLIsWu",
    country: "US",
    shortLink: {
      domain: "getacme.link",
      key: "marvin",
    },
  },
  {
    id: "pn_1K8ND11BZ4XPEX39QX3YMBGY0",
    country: "SG",
    shortLink: {
      domain: "getacme.link",
      key: "kiran-e2e-1",
    },
  },
] as const;

export const E2E_CUSTOMERS = [
  {
    id: "cus_1K82FYFF7RANMCGRHRGMWDNEC",
    externalId: "cus_LnZbkb8boLsOn1YGLPxZGZMU",
    country: "SG",
  },
  {
    id: "cus_1K86CG1DZFW8EMSSWXX4AVZFA",
    externalId: "cus_vq3UgXINHS99MIon8vNvAO1n",
    country: "CA",
  },
] as const;

export const E2E_FRAUD_PARTNER = {
  id: "pn_1K8ND11BZ4XPEX39QX3YMBGY0",
  email: "kiran+e2e+1@dub.co",
  links: {
    customerEmailMatch: {
      domain: "getacme.link",
      key: "fraud-customer-match",
    },
    customerEmailSuspiciousDomain: {
      domain: "getacme.link",
      key: "fraud-customer-suspicious",
    },
    referralSourceBanned: {
      domain: "getacme.link",
      key: "fraud-referral-source-banned",
    },
    paidTrafficDetected: {
      domain: "getacme.link",
      key: "fraud-paid-traffic",
    },
  },
} as const;

export const E2E_FRAUD_REFERRAL_SOURCE_BANNED_DOMAIN =
  "test-hostname-for-referral-source-banned-do-not-delete.com";
