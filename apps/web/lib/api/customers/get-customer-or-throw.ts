import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";
import { CustomerWithLink } from "./transform-customer";

export const getCustomerOrThrow = async (
  {
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  },
  {
    includeExpandedFields = false,
  }: {
    includeExpandedFields?: boolean;
  } = {},
): Promise<CustomerWithLink> => {
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
    ...(includeExpandedFields
      ? {
          include: {
            link: {
              include: {
                programEnrollment: {
                  include: {
                    program: {
                      include: {
                        defaultDiscount: true,
                      },
                    },
                    partner: true,
                    discount: true,
                  },
                },
              },
            },
          },
        }
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
    customer.avatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${customer.id}`;
  }

  return customer;
};
