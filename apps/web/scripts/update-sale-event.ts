import z from "@/lib/zod";
import "dotenv-flow/config";
import { tb } from "../lib/tinybird/client";
import { recordSaleWithTimestamp } from "../lib/tinybird/record-sale";

export const getSaleEvent = tb.buildPipe({
  pipe: "get_sale_event",
  parameters: z.object({
    eventId: z.string(),
  }),
  data: z.any(),
});

// update tinybird sale event
async function main() {
  const eventId = "nBxldg6VxQNUCCwZ";
  const columnName = "event_name";
  const columnValue = "New Subscription Name";

  const { data } = await getSaleEvent({ eventId });
  const oldData = data[0];
  if (!oldData) {
    console.log("No data found");
    return;
  }
  const updatedData = {
    ...oldData,
    [columnName]: columnValue,
  };
  console.log(updatedData);

  const res = await recordSaleWithTimestamp(updatedData);
  console.log(res);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_sale_events",
      eventId,
      columnName,
      oldValue: oldData[columnName],
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      eventId,
      columnName,
      oldValue: oldData[columnName],
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  eventId,
  columnName,
  oldValue,
}: {
  dataSource: string;
  eventId: string;
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
      body: `delete_condition=event_id='${eventId}' and ${columnName}='${oldValue}'`,
    },
  ).then((res) => res.json());
};

main();
