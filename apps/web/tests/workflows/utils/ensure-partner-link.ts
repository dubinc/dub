import { EnrolledPartnerProps } from "@/lib/types";
import { HttpClient } from "../../utils/http";

/**
 * Ensures partner has at least one link for trackE2ELead.
 * If partner.links is empty, creates a link via POST /e2e/partners/links.
 */
export async function ensurePartnerLink(
  http: HttpClient,
  partner: EnrolledPartnerProps,
  query: Record<string, string>,
): Promise<{ domain: string; key: string }> {
  if (partner.links && partner.links.length > 0) {
    return partner.links[0];
  }
  const { status, data } = await http.post<{ domain: string; key: string }>({
    path: "/e2e/partners/links",
    query,
    body: { partnerId: partner.id },
  });
  if (status !== 201) {
    throw new Error(
      `Failed to create partner link: ${status} ${JSON.stringify(data)}`,
    );
  }
  return data;
}
