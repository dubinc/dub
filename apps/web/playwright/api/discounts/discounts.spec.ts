import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type {
  Customer,
  CustomerEnriched,
  DiscountProps,
  EnrolledPartnerProps,
  GroupProps,
} from "@/lib/types";
import { DEFAULT_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { DiscountProvider, RewardStructure } from "@prisma/client";
import { randomCustomer, randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import {
  createPartner as createPartnerApi,
  deletePartner,
} from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

test.describe.configure({
  mode: "parallel",
});

const customDiscount = {
  amount: 10,
  type: RewardStructure.percentage,
  maxDuration: 6,
  provider: DiscountProvider.custom,
};

const expectedCustomDiscount = {
  ...customDiscount,
  couponId: null,
  couponTestId: null,
  description: null,
  autoProvisionEnabledAt: null,
};

const expectedCustomerDiscount = {
  id: expect.any(String),
  amount: customDiscount.amount,
  type: customDiscount.type,
  maxDuration: customDiscount.maxDuration,
  couponId: null,
  couponTestId: null,
  description: null,
};

let customDiscountId: string | undefined;
let partnerGroupId: string | undefined;

test.beforeAll(async ({ program }) => {
  const discount = await prisma.discount.create({
    data: {
      id: createId({ prefix: "disc_" }),
      programId: program.id,
      ...customDiscount,
    },
  });

  const group = await prisma.partnerGroup.create({
    data: {
      id: createId({ prefix: "grp_" }),
      programId: program.id,
      slug: `pw-disc-${nanoid(8).toLowerCase()}`,
      name: "Playwright Custom Discounts",
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
      discountId: discount.id,
    },
  });

  await prisma.partnerGroupDefaultLink.create({
    data: {
      id: createId({ prefix: "pgdl_" }),
      programId: program.id,
      groupId: group.id,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
    },
  });

  partnerGroupId = group.id;
  customDiscountId = discount.id;
});

test.afterAll(async () => {
  if (partnerGroupId) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: partnerGroupId,
      },
      select: {
        partnerId: true,
      },
    });

    for (const enrollment of programEnrollments) {
      await deletePartner(enrollment.partnerId);
    }

    await prisma.partnerGroupDefaultLink.deleteMany({
      where: {
        groupId: partnerGroupId,
      },
    });

    await prisma.partnerGroup.delete({
      where: {
        id: partnerGroupId,
      },
    });
  }

  if (customDiscountId) {
    await prisma.discountCode.deleteMany({
      where: {
        discountId: customDiscountId,
      },
    });

    await prisma.programEnrollment.updateMany({
      where: {
        discountId: customDiscountId,
      },
      data: {
        discountId: null,
      },
    });

    await prisma.discount.delete({
      where: {
        id: customDiscountId,
      },
    });
  }
});

async function createPartner(api: ApiClient) {
  if (!partnerGroupId) {
    throw new Error("Custom discount group was not seeded.");
  }

  return createPartnerApi(api, {
    groupId: partnerGroupId,
  });
}

async function createCustomerWithCustomDiscount({
  api,
  program,
}: {
  api: ApiClient;
  program: { id: string };
}) {
  const { data: partner } = await createPartner(api);
  const linkId = partner.links?.[0]?.id;

  if (!linkId) {
    throw new Error("Partner was created without a default link.");
  }

  const { data: customer } = await api.post<Customer>(
    "/api/customers",
    randomCustomer(),
  );

  await prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      linkId,
      partnerId: partner.id,
      programId: program.id,
    },
  });

  return { partner, customer };
}

async function deleteCustomer(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/customers/${id}`);
}

test("GET /programs/{programId}/discounts – custom provider", async ({
  api,
  program,
}) => {
  const { status, data } = await api.get<DiscountProps[]>(
    `/api/programs/${program.id}/discounts`,
  );

  expect(status).toEqual(200);

  const discount = data.find((item) => item.id === customDiscountId);

  expect(discount).toEqual({
    id: customDiscountId,
    ...expectedCustomDiscount,
    partnersCount: expect.any(Number),
  });
});

test("GET /groups/{id} – nested custom discount", async ({ api }) => {
  const { status, data } = await api.get<GroupProps>(
    `/api/groups/${partnerGroupId}`,
  );

  expect(status).toEqual(200);
  expect(data.discount).toEqual({
    id: customDiscountId,
    ...expectedCustomDiscount,
  });
});

test("GET /groups/{id} – group without discount", async ({ api, program }) => {
  let groupId: string | undefined;

  try {
    const group = await prisma.partnerGroup.create({
      data: {
        id: createId({ prefix: "grp_" }),
        programId: program.id,
        slug: `pw-nodisc-${nanoid(8).toLowerCase()}`,
        name: randomName("group"),
        maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
      },
    });
    groupId = group.id;

    const { status, data } = await api.get<GroupProps>(
      `/api/groups/${groupId}`,
    );

    expect(status).toEqual(200);
    expect(data.discount).toBeNull();
  } finally {
    if (groupId) {
      await prisma.partnerGroup.delete({
        where: {
          id: groupId,
        },
      });
    }
  }
});

test("GET /partners/{id} – custom discount", async ({ api }) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const { status, data } = await api.get<
      EnrolledPartnerProps & {
        discount: Pick<DiscountProps, "id" | "provider"> | null;
      }
    >(`/api/partners/${partnerId}`);

    expect(status).toEqual(200);
    expect(data.discount).toEqual({
      id: customDiscountId,
      provider: DiscountProvider.custom,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("GET /customers/{id} – custom discount", async ({ api, program }) => {
  let partnerId: string | undefined;
  let customerId: string | undefined;

  try {
    const { partner, customer } = await createCustomerWithCustomDiscount({
      api,
      program,
    });
    partnerId = partner.id;
    customerId = customer.id;

    const { status, data } = await api.get<CustomerEnriched>(
      `/api/customers/${customerId}?includeExpandedFields=true`,
    );

    expect(status).toEqual(200);
    expect(data.discount).toMatchObject({
      ...expectedCustomerDiscount,
      id: customDiscountId,
    });
    expect(data.discount).not.toHaveProperty("provider");
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});

test("GET /customers?email= – custom discount", async ({ api, program }) => {
  let partnerId: string | undefined;
  let customerId: string | undefined;

  try {
    const { partner, customer } = await createCustomerWithCustomDiscount({
      api,
      program,
    });
    partnerId = partner.id;
    customerId = customer.id;

    const { status, data: customers } = await api.get<CustomerEnriched[]>(
      `/api/customers?email=${encodeURIComponent(customer.email!)}&includeExpandedFields=true`,
    );

    expect(status).toEqual(200);
    expect(customers[0].discount).toMatchObject({
      ...expectedCustomerDiscount,
      id: customDiscountId,
    });
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});

test("GET /customers?externalId= – custom discount", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  let customerId: string | undefined;

  try {
    const { partner, customer } = await createCustomerWithCustomDiscount({
      api,
      program,
    });
    partnerId = partner.id;
    customerId = customer.id;

    const { status, data: customers } = await api.get<CustomerEnriched[]>(
      `/api/customers?externalId=${encodeURIComponent(customer.externalId!)}&includeExpandedFields=true`,
    );

    expect(status).toEqual(200);
    expect(customers[0].discount).toMatchObject({
      ...expectedCustomerDiscount,
      id: customDiscountId,
    });
  } finally {
    await deleteCustomer(api, customerId);
    await deletePartner(partnerId);
  }
});
