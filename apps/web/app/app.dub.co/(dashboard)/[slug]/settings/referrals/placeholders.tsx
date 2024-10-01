import { randomValue } from "@dub/utils";
import { subDays } from "date-fns";

export const placeholderEvents = {
  clicks: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
      }) as any,
  ),

  leads: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
      }) as any,
  ),

  sales: [...Array(10)].map(
    (_, idx) =>
      ({
        timestamp: subDays(new Date(), idx).toISOString(),
        click_id: "1",
        link_id: "1",
        domain: "refer.dub.co",
        key: "",
        url: "https://dub.co",
        country: randomValue(["US", "GB", "CA", "AU", "DE", "FR", "ES", "IT"]),
        event_name: [
          "Subscription creation",
          "Subscription paid",
          "Plan upgraded",
        ][idx % 3],
        // TODO update to saleAmount
        amount: [1100, 4900, 2400][idx % 3],
      }) as any,
  ),
};
