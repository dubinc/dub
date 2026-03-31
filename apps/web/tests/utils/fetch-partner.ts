import { EnrolledPartnerProps } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "./http";

export async function fetchPartner({
  http,
  partnerId,
}: {
  http: HttpClient;
  partnerId: string;
}) {
  const { data, status } = await http.get<EnrolledPartnerProps[]>({
    path: `/partners?partnerIds=${partnerId}`,
  });

  expect(status).toEqual(200);
  expect(data.length).toBeGreaterThan(0);

  return data[0];
}
