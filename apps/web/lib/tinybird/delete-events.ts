const TINYBIRD_ID_PATTERN = /^[a-zA-Z0-9_]+$/;

function assertSafeTinybirdId(value: string, label: string) {
  if (!TINYBIRD_ID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label} for Tinybird delete.`);
  }
}

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
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Tinybird delete failed for ${dataSource}: ${JSON.stringify(payload)}`,
    );
  }

  return payload;
}

export async function deleteTinybirdCustomerEvents({
  customerId,
  clickId,
}: {
  customerId: string;
  clickId?: string | null;
}) {
  assertSafeTinybirdId(customerId, "customerId");

  const customerCondition = `customer_id='${customerId}'`;

  const deletions: Promise<unknown>[] = [
    deleteDatasourceRows({
      dataSource: "dub_lead_events",
      deleteCondition: customerCondition,
    }),
    deleteDatasourceRows({
      dataSource: "dub_lead_events_mv",
      deleteCondition: customerCondition,
    }),
    deleteDatasourceRows({
      dataSource: "dub_sale_events",
      deleteCondition: customerCondition,
    }),
    deleteDatasourceRows({
      dataSource: "dub_sale_events_mv",
      deleteCondition: customerCondition,
    }),
  ];

  if (clickId) {
    assertSafeTinybirdId(clickId, "clickId");
    const clickCondition = `click_id='${clickId}'`;

    deletions.push(
      deleteDatasourceRows({
        dataSource: "dub_click_events",
        deleteCondition: clickCondition,
      }),
      deleteDatasourceRows({
        dataSource: "dub_click_events_mv",
        deleteCondition: clickCondition,
      }),
      deleteDatasourceRows({
        dataSource: "dub_click_events_id",
        deleteCondition: clickCondition,
      }),
    );
  }

  const results = await Promise.allSettled(deletions);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    throw new Error(
      `Failed to delete ${failed.length} Tinybird datasource(s) for customer ${customerId}.`,
    );
  }

  return results;
}
