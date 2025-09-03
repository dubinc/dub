import z from "@/lib/zod";
import "dotenv-flow/config";
import { tb } from "../../lib/tinybird/client";
import { recordLeadWithTimestamp } from "../../lib/tinybird/record-lead";

const getLeadEvent = tb.buildPipe({
  pipe: "get_lead_event_by_id",
  parameters: z.object({
    eventId: z.string(),
  }),
  data: z.any(),
});

// update tinybird lead event
async function main() {
  const eventId = "9Q22Mkh9edsHdePl";
  const columnName = "event_name";
  const columnValue = "Manual commission for QE6IwYufKjVaHFbreyW3";

  const { data } = await getLeadEvent({ eventId });
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

  const res = await recordLeadWithTimestamp(updatedData);
  console.log(res);

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_lead_events",
      eventId,
      columnName,
      oldValue: oldData[columnName],
    }),
    deleteData({
      dataSource: "dub_lead_events_mv",
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
