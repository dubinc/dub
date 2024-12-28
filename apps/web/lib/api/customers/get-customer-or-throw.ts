import { prisma } from "@dub/prisma";
import { Customer, Link, ProgramEnrollment } from "@dub/prisma/client";
import { DubApiError } from "../errors";

export const getCustomerOrThrow = async (
  {
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  },
  { expand }: { expand?: "link"[] } = {},
): Promise<
  Customer & {
    link?:
      | (Link & {
          programEnrollment?: ProgramEnrollment | null;
        })
      | null;
  }
> => {
  const customer = await prisma.customer.findUnique({
    where: {
      ...(id.startsWith("ext_")
        ? {
            projectId_externalId: {
              projectId: workspaceId,
              externalId: id.replace("ext_", ""),
            },
          }
        : { id }),
    },
    ...(expand?.includes("link")
      ? { include: { link: { include: { programEnrollment: true } } } }
      : {}),
  });

  if (!customer || customer.projectId !== workspaceId) {
    throw new DubApiError({
      code: "not_found",
      message:
        "Customer not found. Make sure you're using the correct customer ID (e.g. `cus_3TagGjzRzmsFJdH8od2BNCsc`) or external ID (has to be prefixed with `ext_`).",
    });
  }

  if (!customer.avatar) {
    customer.avatar = `https://api.dicebear.com/9.x/notionists/png?seed=${customer.id}`;
  }

  return customer;
};
