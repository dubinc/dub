import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { recordSaleWithTimestamp } from "../../lib/tinybird/record-sale";
import { getSaleEvents } from "./get-sale-events";

// update tinybird sale event
async function main() {
  const CUSTOMER_ID = "cus_xxx";
  const OLD_LINK_ID = "link_xxx";
  const NEW_LINK_ID = "link_xxx";

  const newLink = await prisma.link.findUniqueOrThrow({
    where: {
      id: NEW_LINK_ID,
    },
  });

  const { data: oldData } = await getSaleEvents({ customerId: CUSTOMER_ID });
  if (oldData.length === 0) {
    console.log("No data found");
    return;
  }
  const updatedData = oldData.map((item) => ({
    ...item,
    link_id: newLink.id,
    key: newLink.key,
  }));
  console.log(updatedData);

  const res = await recordSaleWithTimestamp(updatedData);
  console.log(res);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_sale_events",
      customerId: CUSTOMER_ID,
      columnName: "link_id",
      oldValue: OLD_LINK_ID,
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      customerId: CUSTOMER_ID,
      columnName: "link_id",
      oldValue: OLD_LINK_ID,
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  customerId,
  columnName,
  oldValue,
}: {
  dataSource: string;
  customerId: string;
  columnName: string;
  oldValue: string;
}) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=customer_id='${customerId}' and ${columnName}='${oldValue}'`,
    },
  ).then((res) => res.json());
};

main();
