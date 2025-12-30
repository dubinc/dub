import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let customersToBackfill: {
  customerId: string;
  sales: number;
  saleAmount: number;
}[] = [];

async function main() {
  Papa.parse(fs.createReadStream("customer_sales.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        customerId: string;
        sales: string;
        saleAmount: string;
      };
    }) => {
      customersToBackfill.push({
        customerId: result.data.customerId,
        sales: parseInt(result.data.sales),
        saleAmount: parseInt(result.data.saleAmount),
      });
    },
    complete: async () => {
      console.table(
        customersToBackfill
          .slice(0, 10)
          .concat(customersToBackfill.slice(90, 100)),
      );

      // take first 100 customers, backfill, and delete from csv
      const chunkedCustomers = customersToBackfill.slice(0, 100);

      await Promise.all(
        chunkedCustomers.map(async (customer) => {
          try {
            await prisma.customer.update({
              where: { id: customer.customerId },
              data: {
                sales: customer.sales,
                saleAmount: customer.saleAmount,
              },
            });
          } catch (error) {
            console.log(
              `Can't find customer ${customer.customerId} with sales ${customer.sales} and sale amount ${customer.saleAmount}`,
            );
          }
        }),
      );

      // delete from csv
      customersToBackfill = customersToBackfill.slice(100);
      fs.writeFileSync("customer_sales.csv", Papa.unparse(customersToBackfill));
    },
  });
}

main();
