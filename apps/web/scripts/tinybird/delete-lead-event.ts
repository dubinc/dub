import "dotenv-flow/config";

// update tinybird sale event
async function main() {
  const deleteCondition = "customer_id = 'cus_1JR0TMY8CHWH303VGQEX6H6KQ'";

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_lead_events",
      deleteCondition,
    }),
    deleteData({
      dataSource: "dub_lead_events_mv",
      deleteCondition,
    }),
  ]);
  console.log(deleteRes);
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
