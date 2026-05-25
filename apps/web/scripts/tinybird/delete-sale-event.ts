import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { syncPartnerLinksStats } from "../../lib/api/partners/sync-partner-links-stats";
import { getSaleEvent } from "../../lib/tinybird/get-sale-event";

// update tinybird sale event
async function main() {
  const eventId = "xxx";
  const deleteCondition = `event_id = '${eventId}'`;
  const { data } = await getSaleEvent({ eventId });
  const oldData = data[0];
  if (!oldData) {
    console.log("No data found");
    return;
  }

  const { link_id, customer_id } = oldData;
  const [link, customer] = await Promise.all([
    prisma.link.findUniqueOrThrow({
      where: {
        id: link_id,
      },
    }),
    prisma.customer.findUniqueOrThrow({
      where: {
        id: customer_id,
      },
    }),
  ]);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_sale_events",
      deleteCondition,
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      deleteCondition,
    }),
  ]);
  console.log(deleteRes);

  await prisma.link.update({
    where: {
      id: link.id,
    },
    data: {
      sales: {
        decrement: 1,
      },
      saleAmount: {
        decrement: oldData.amount,
      },
    },
  });

  await prisma.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      sales: {
        decrement: 1,
      },
      saleAmount: {
        decrement: oldData.amount,
      },
    },
  });

  await syncPartnerLinksStats({
    partnerId: link.partnerId!,
    programId: link.programId!,
    eventType: "sale",
  });
}

const deleteData = async ({
  dataSource,
  deleteCondition,
}: {
  dataSource: string;
  deleteCondition: string;
}) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=${deleteCondition}`,
    },
  ).then((res) => res.json());
};

main();
