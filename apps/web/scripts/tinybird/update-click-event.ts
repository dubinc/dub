import "dotenv-flow/config";
import { getClickEvent } from "../../lib/tinybird/get-click-event";

// update tinybird sale event
async function main() {
  const clickId = "D0aoUca8hLdzmJJE";
  const columnName = "link_id";
  const columnValue = "link_xxx";

  const oldData = await getClickEvent({ clickId });
  if (!oldData) {
    console.log("No data found");
    return;
  }
  const updatedData = {
    ...oldData,
    vercel_region: "iad1",
    [columnName]: columnValue,
  };
  console.log(updatedData);

  const res = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      body: JSON.stringify(updatedData),
    },
  ).then((res) => res.json());
  console.log(res);

  // delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_click_events_mv",
      clickId,
      columnName,
      oldValue: "link_1KPRDAYXXE9D2FYM691BK5C59",
    }),
    deleteData({
      dataSource: "dub_click_events_id",
      clickId,
      columnName,
      oldValue: "link_1KPRDAYXXE9D2FYM691BK5C59",
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  clickId,
  columnName,
  oldValue,
}: {
  dataSource: string;
  clickId: string;
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
      body: `delete_condition=click_id='${clickId}' and ${columnName}='${oldValue}'`,
    },
  ).then((res) => res.json());
};

main();
