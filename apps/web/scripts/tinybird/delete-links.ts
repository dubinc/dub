import "dotenv-flow/config";

// update tinybird sale event
async function main() {
  const deleteCondition = "domain = 'xyz'";

  //  delete data from tinybird
  const deleteRes = await Promise.allSettled([
    deleteData({
      dataSource: "dub_links_metadata",
      deleteCondition,
    }),
    deleteData({
      dataSource: "dub_links_metadata_latest",
      deleteCondition,
    }),
    deleteData({
      dataSource: "dub_regular_links_metadata_latest",
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
