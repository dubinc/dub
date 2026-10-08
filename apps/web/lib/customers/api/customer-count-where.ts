import { sanitizeFullTextSearch } from "@/lib/prisma";
import { getCustomersCountQuerySchema } from "@/lib/zod/schemas/customers";
import { Prisma } from "@prisma/client";
import * as z from "zod/v4";

type CustomerCountFilters = z.infer<typeof getCustomersCountQuerySchema> & {
  workspaceId: string;
};

export function buildCustomerSearchWhere({
  email,
  externalId,
  search: rawSearch,
}: {
  email?: string | null;
  externalId?: string | null;
  search?: string | null;
}): Prisma.CustomerWhereInput {
  if (email) return { email };

  if (externalId) return { externalId };

  const search = rawSearch?.trim();
  if (!search) return {};

  const isExactCustomerIdQuery = /^cus_[a-z0-9]{24,}$/i.test(search);
  if (isExactCustomerIdQuery) return { id: search };

  if (search.includes("@")) return { email: search };

  const q = sanitizeFullTextSearch(search);
  return {
    email: { search: q },
    name: { search: q },
  };
}

export function buildCustomerCountWhere(filters: CustomerCountFilters) {
  const {
    programId,
    partnerId,
    workspaceId,
    email,
    externalId,
    search,
    country,
    linkId,
    groupBy,
  } = filters;

  const customerWhereInput: Prisma.CustomerWhereInput = {
    ...(programId && {
      programId,
    }),
    ...(partnerId && {
      partnerId,
    }),
    projectId: workspaceId,
    ...buildCustomerSearchWhere({ email, externalId, search }),
    // only filter by country if not grouping by country
    ...(country &&
      groupBy !== "country" && {
        country,
      }),
    // only filter by linkId if not grouping by linkId
    ...(linkId &&
      groupBy !== "linkId" && {
        linkId,
      }),
  };

  return customerWhereInput;
}
