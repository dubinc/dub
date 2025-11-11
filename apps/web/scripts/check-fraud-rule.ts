import "dotenv-flow/config";
import { detectFraudEvent } from "@/lib/fraud/detect-fraud-event";
import { EventType } from "@dub/prisma/client";

async function main() {
  const conversionEvent = {
    programId: "123",
    partner: {
      id: "partner-123",
      email: "kiran@example.com",
      name: "Kiran",
    },
    customer: {
      id: "customer-123",
      email: "kirank@10minutesmail.fr",
      name: "Kiran",
    },
    event: {
      id: "event-123",
      type: EventType.lead,
      timestamp: new Date().toISOString(),
    },
    click: {
      ip: "127.0.0.1",
      referer: "https://example.com",
      country: "US",
      timestamp: new Date().toISOString(),
    },
  };

  const result = await detectFraudEvent(conversionEvent);

  console.log(JSON.stringify(result, null, 2));
}

main();
