import { generateRandomName } from "@/lib/names";
import { OG_AVATAR_URL, nanoid, randomValue } from "@dub/utils";
import { expect } from "vitest";

export const randomId = (length = 24) => nanoid(length);

// Generate random customer data
export const randomCustomer = ({
  emailDomain = "example.com",
}: { emailDomain?: string } = {}) => {
  const externalId = `cus_${randomId()}`;
  const customerName = generateRandomName();

  return {
    externalId,
    name: customerName,
    email: `${customerName.split(" ").join(".").toLowerCase()}@${emailDomain}`,
    avatar: `${OG_AVATAR_URL}${externalId}`,
  };
};

export const randomTagName = (length?: number) => {
  return `e2e-${randomId(length)}`;
};

export const randomPartnerEmail = ({
  domain = "dub-internal-test.com",
}: {
  domain?: string;
} = {}) => {
  return `${generateRandomName().split(" ").join(".").toLowerCase()}@${domain}`;
};

export const randomSaleAmount = () => {
  return randomValue([400, 900, 1900]);
};

export async function retry<T>(
  fn: () => Promise<T>,
  {
    retries = 10,
    interval = 300,
  }: { retries?: number; interval?: number } = {},
): Promise<T> {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, interval));
      }
    }
  }

  throw lastError;
}

export function expectSortedById(
  items: { id: string }[],
  order: "asc" | "desc",
) {
  for (let i = 0; i < items.length - 1; i++) {
    const cmp = items[i].id.localeCompare(items[i + 1].id);
    if (order === "desc") {
      expect(cmp).toBeGreaterThanOrEqual(0);
    } else {
      expect(cmp).toBeLessThanOrEqual(0);
    }
  }
}

export function expectSortedByCreatedAt<T extends { createdAt: string | Date }>(
  items: T[],
) {
  for (let i = 0; i < items.length - 1; i++) {
    const a = new Date(items[i].createdAt).getTime();
    const b = new Date(items[i + 1].createdAt).getTime();
    expect(a).toBeGreaterThanOrEqual(b);
  }
}

export function expectSortedByCreatedAtAsc<
  T extends { createdAt: string | Date },
>(items: T[]) {
  for (let i = 0; i < items.length - 1; i++) {
    const a = new Date(items[i].createdAt).getTime();
    const b = new Date(items[i + 1].createdAt).getTime();
    expect(a).toBeLessThanOrEqual(b);
  }
}

export function expectNoOverlap<T extends { id: string }>(a: T[], b: T[]) {
  const overlap = a.map((x) => x.id).filter((id) => b.some((x) => x.id === id));
  expect(overlap).toHaveLength(0);
}
