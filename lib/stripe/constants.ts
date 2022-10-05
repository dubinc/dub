export const getPlanFromUsageLimit = (usageLimit: number) => {
  return PRO_TIERS.find((tier) => tier.quota === usageLimit)?.name || "Free";
};

export const PRO_TIERS = [
  {
    name: "Pro 10K",
    quota: 10000,
    price: {
      monthly: {
        amount: 9,
        priceIds: {
          test: "price_1LoytoAlJJEpqkPV2oPcQ63m",
          production: "price_1LodNLAlJJEpqkPVQSrt33Lc",
        },
      },
      yearly: {
        amount: 90,
        priceIds: {
          test: "price_1LoytoAlJJEpqkPVsWjM4tB9",
          production: "price_1LodNLAlJJEpqkPVRxUyCQgZ",
        },
      },
    },
  },
  {
    name: "Pro 25K",
    quota: 25000,
    price: {
      monthly: {
        amount: 19,
        priceIds: {
          test: "price_1LoytHAlJJEpqkPVonefD3RW",
          production: "price_1LodMrAlJJEpqkPVq3XV2Y3R",
        },
      },
      yearly: {
        amount: 190,
        priceIds: {
          test: "price_1LoytHAlJJEpqkPVP25C5yjd",
          production: "price_1LodMrAlJJEpqkPViKR29tq8",
        },
      },
    },
  },
  {
    name: "Pro 50K",
    quota: 50000,
    price: {
      monthly: {
        amount: 29,
        priceIds: {
          test: "price_1LoyrzAlJJEpqkPVVZfXIZE5",
          production: "price_1LodMEAlJJEpqkPVrMdRwaSk",
        },
      },
      yearly: {
        amount: 290,
        priceIds: {
          test: "price_1LoyrzAlJJEpqkPVtCBUz78P",
          production: "price_1LodMEAlJJEpqkPV5ztz7wyg",
        },
      },
    },
  },
  {
    name: "Pro 100K",
    quota: 100000,
    price: {
      monthly: {
        amount: 49,
        priceIds: {
          test: "price_1LoyrCAlJJEpqkPVZ32BV3wm",
          production: "price_1LodLoAlJJEpqkPV9rD0rlNL",
        },
      },
      yearly: {
        amount: 490,
        priceIds: {
          test: "price_1LoyrCAlJJEpqkPVgIlNG23q",
          production: "price_1LodLoAlJJEpqkPVJdwv5zrG",
        },
      },
    },
  },
  {
    name: "Pro 500K",
    quota: 500000,
    price: {
      monthly: {
        amount: 79,
        priceIds: {
          test: "price_1LoyqQAlJJEpqkPVGy7kyuxS",
          production: "price_1LodLIAlJJEpqkPVi7javvun",
        },
      },
      yearly: {
        amount: 790,
        priceIds: {
          test: "price_1LoyqQAlJJEpqkPVdWYVpS76",
          production: "price_1LodLIAlJJEpqkPValZ9TmgF",
        },
      },
    },
  },
  {
    name: "Pro 1M",
    quota: 1000000,
    price: {
      monthly: {
        amount: 99,
        priceIds: {
          test: "price_1Lis30AlJJEpqkPVAuSVxbT1",
          production: "price_1Lis1VAlJJEpqkPV7sUnggB3",
        },
      },
      yearly: {
        amount: 990,
        priceIds: {
          test: "price_1LoymUAlJJEpqkPVDX9fNCu7",
          production: "price_1LodJMAlJJEpqkPV2K0xX2kF",
        },
      },
    },
  },
];
