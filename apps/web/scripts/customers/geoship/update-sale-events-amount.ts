import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { tb } from "../../../lib/tinybird/client";
import { recordSaleWithTimestamp } from "../../../lib/tinybird/record-sale";

const getSaleEvent = tb.buildPipe({
  pipe: "get_sale_events",
  parameters: z.object({
    linkId: z.string(),
  }),
  data: z.any(),
});

// update tinybird sale event
async function main() {
  const linkId = "link_xxx";
  const columnName = "amount";
  const columnValue = 20000;

  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
  });

  const { data } = await getSaleEvent({ linkId });
  if (data.length === 0) {
    console.log("No data found");
    return;
  }
  const updatedData = data.map((item) => ({
    ...item,
    [columnName]: columnValue,
    domain: link.domain,
    key: link.key,
    workspace_id: link.projectId,
  }));
  console.log(updatedData);

  const res = await recordSaleWithTimestamp(updatedData);
  console.log(res);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_sale_events",
      linkId,
      columnName,
      oldValue: 50000,
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      linkId,
      columnName,
      oldValue: 50000,
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  linkId,
  columnName,
  oldValue,
}: {
  dataSource: string;
  linkId: string;
  columnName: string;
  oldValue: number;
}) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=link_id='${linkId}' and ${columnName}='${oldValue}'`,
    },
  ).then((res) => res.json());
};

main();
