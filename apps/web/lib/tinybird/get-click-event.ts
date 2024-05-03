import { clickEventSchemaTB } from "../zod/schemas/conversions";

export async function getClickEvent(clickId: string) {
  const url = new URL(
    `${process.env.TINYBIRD_API_URL}/v0/pipes/click_by_id.json`,
  );

  url.searchParams.append("clickId", clickId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
    },
  });

  if (!response.ok) {
    console.error("Error fetching click event from Tinybird", response);
    return null;
  }

  const { rows, data } = await response.json();

  if (rows === 0) {
    console.error("No click event found in Tinybird", clickId);
    return null;
  }

  return clickEventSchemaTB.parse(data[0]);
}
