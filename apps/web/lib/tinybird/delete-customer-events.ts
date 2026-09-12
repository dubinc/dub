async function deleteDatasourceRows({
  dataSource,
  deleteCondition,
}: {
  dataSource: string;
  deleteCondition: string;
}) {
  const baseUrl = process.env.TINYBIRD_API_URL;
  const token = process.env.TINYBIRD_API_KEY;

  if (!baseUrl || !token) {
    throw new Error("Tinybird is not configured.");
  }

  const response = await fetch(
    `${baseUrl}/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=${deleteCondition}`,
      signal: AbortSignal.timeout(30_000),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Tinybird delete failed for ${dataSource}: ${JSON.stringify(payload)}`,
    );
  }

  console.log(`Deleted rows matching ${deleteCondition} from ${dataSource}`);

  return payload;
}

export async function deleteTinybirdCustomerEvents({
  customerId,
}: {
  customerId: string;
}) {
  if (!customerId.startsWith("cus_")) {
    throw new Error(`Invalid customer ID: ${customerId}`);
  }

  const customerCondition = `customer_id='${customerId}'`;

  const dataSources = [
    "dub_lead_events",
    "dub_lead_events_mv",
    "dub_sale_events",
    "dub_sale_events_mv",
  ];

  // Delete sequentially to avoid Tinybird rate limits
  for (const dataSource of dataSources) {
    await deleteDatasourceRows({
      dataSource,
      deleteCondition: customerCondition,
    });
  }
}
