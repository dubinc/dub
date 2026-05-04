import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { tb } from "../../lib/tinybird/client";

const getEvents = tb.buildPipe({
  pipe: "internal_get_events",
  parameters: z.object({
    customerId: z.string(),
  }),
  data: z.any(),
});

// update tinybird lead event
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
  const oldData = data[0];
  if (!oldData) {
    console.log("No data found");
    return;
  }
  const updatedData = {
    ...oldData,
    link_id: newLink.id,
    key: newLink.key,
  };
  // console.log(updatedData);

  // const res = await recordLeadWithTimestamp(updatedData);
  // console.log(res);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_lead_events",
      customerId,
      columnName: "link_id",
      oldValue: oldLinkId,
    }),
    deleteData({
      dataSource: "dub_lead_events_mv",
      customerId,
      columnName: "link_id",
      oldValue: oldLinkId,
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
