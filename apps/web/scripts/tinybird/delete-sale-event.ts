import "dotenv-flow/config";

// update tinybird sale event
async function main() {
  const eventId = "xxx";

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_sale_events",
      eventId,
    }),
    deleteData({
      dataSource: "dub_sale_events_mv",
      eventId,
    }),
    deleteData({
      dataSource: "dub_sale_events_id",
      eventId,
    }),
  ]);
  console.log(deleteRes);
}

const deleteData = async ({
  dataSource,
  eventId,
}: {
  dataSource: string;
  eventId: string;
}) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=event_id='${eventId}'`,
    },
  ).then((res) => res.json());
};

main();
