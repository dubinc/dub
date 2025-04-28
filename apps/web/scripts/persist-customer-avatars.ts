import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";
import { storage } from "../lib/storage";

const R2_URL = "https://dubassets.com";

async function main() {
  const where: Prisma.CustomerWhereInput = {
    avatar: {
      startsWith: "https://lh3.googleusercontent.com",
    },
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  await Promise.all(
    customers.map(async (customer) => {
      if (!customer.avatar) {
        return;
      }
      const finalCustomerAvatar = `${R2_URL}/customers/${customer.id}/avatar_${nanoid(7)}`;

      try {
        await storage.upload(
          finalCustomerAvatar.replace(`${R2_URL}/`, ""),
          customer.avatar,
          {
            width: 128,
            height: 128,
          },
        );

        const updatedCustomer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            avatar: finalCustomerAvatar,
          },
        });

        console.log(
          `Updated customer ${customer.id} to ${updatedCustomer.avatar}`,
        );
      } catch (error) {
        console.log(
          `Error updating customer ${customer.id} with avatar ${customer.avatar}`,
        );
        console.error(error);
      }
    }),
  );

  const remainingCustomers = await prisma.customer.count({
    where,
  });

  console.log(`Remaining customers: ${remainingCustomers}`);
}
main();
