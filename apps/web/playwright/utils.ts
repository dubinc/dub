import { generateRandomName } from "@/lib/names";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";

export function randomName(prefix = "e2e", length = 5) {
  return `${prefix}-${nanoid(length)}`;
}

export function randomCustomer({
  emailDomain = "dub-internal-test.com",
}: {
  emailDomain?: string;
} = {}) {
  const id = nanoid(12);
  const name = generateRandomName();

  return {
    externalId: `ext_pw_${id}`,
    name,
    email: `pw.${id}@${emailDomain}`,
    avatar: null as string | null,
    country: "US",
  };
}

export function randomPartnerEmail({
  domain = "dub-internal-test.com",
}: {
  domain?: string;
} = {}) {
  return `pw.${nanoid(12)}@${domain}`;
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

export function expectNoOverlap<T extends { id: string }>(a: T[], b: T[]) {
  const overlap = a.map((x) => x.id).filter((id) => b.some((y) => y.id === id));
  expect(overlap).toHaveLength(0);
}
