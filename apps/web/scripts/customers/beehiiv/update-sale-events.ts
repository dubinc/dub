import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { tb } from "../../../lib/tinybird/client";
import { recordSaleWithTimestamp } from "../../../lib/tinybird/record-sale";

const getEvents = tb.buildPipe({
  pipe: "internal_get_events",
  parameters: z.object({
    customerId: z.string(),
  }),
  data: z.any(),
});

// update tinybird sale event
async function main() {
  const customerId = "cus_xxx";
  const oldLinkId = "link_xxx";
  const newLinkId = "link_xxx";

  const newLink = await prisma.link.findUniqueOrThrow({
    where: {
      id: newLinkId,
    },
  });

  const { data } = await getEvents({ customerId });
  if (data.length === 0) {
    console.log("No data found");
    return;
  }
  const updatedData = data.map((item) => ({
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
      linkId: oldLinkId,
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      linkId: oldLinkId,
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  linkId,
}: {
  dataSource: string;
  linkId: string;
}) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=link_id='${linkId}' and customer_id='cus_1KPRE36329N3YYR6YPG0KXB2J'`,
    },
  ).then((res) => res.json());
};

main();
