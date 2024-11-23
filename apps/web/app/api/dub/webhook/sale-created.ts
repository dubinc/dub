import { SaleCreatedEvent } from "dub/models/components";

export async function saleCreated(data: SaleCreatedEvent["data"]) {
  const { link: referralLink } = data;

  if (!referralLink) {
    return "Referral link not found in webhook payload";
  }

  return `Successfully handled referral sale event for referral link ${referralLink.id} (${referralLink.shortLink})`;
}
