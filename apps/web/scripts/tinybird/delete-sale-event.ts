import "dotenv-flow/config";

// update tinybird sale event
async function main() {
  const deleteCondition = "event_id = 'PBsBVOHgVrBcs68F'";

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
    deleteData({
      dataSource: "dub_sale_events_id",
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
