import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // const conversionEvent = {
  //   programId: "123",
  //   partner: {
  //     id: "partner-123",
  //     email: "kiran@example.com",
  //     name: "Kiran",
  //   },
  //   customer: {
  //     id: "customer-123",
  //     email: "kirank@10minutesmail.fr",
  //     name: "Kiran",
  //   },
  //   event: {
  //     id: "event-123",
  //     type: EventType.lead,
  //     timestamp: new Date().toISOString(),
  //   },
  //   click: {
  //     ip: "127.0.0.1",
  //     referer: "https://example.com",
  //     country: "US",
  //     timestamp: new Date().toISOString(),
  //   },
  // };

  // const result = await detectFraudEvent(conversionEvent);

  // console.log(JSON.stringify(result, null, 2));

  // const result = await checkPaidAdTrafficDetected.evaluate(
  //   {
  //     click: {
  //       url: "https://www.framer.com/marketplace/templates/?via=luna-luna-6oplgc&gad_campaignid=22932228705&gbraid=0AAAAA-w3x0xGJ9gAN5nzVnvRWPYWyrDRY&gclid=Cj0KCQjw9JLHBhC-ARIsAK4PhcrYZRzKLKXfLkWiDbQO-A3LgsVhYMfrsWOkliw1kGdXMZaru5q5GZ0aAtOLEALw_wcB",
  //       referer: "google.com",
  //     },
  //   },
  //   {
  //     queryParams: ["gclid", "gad_source", "gad_campaignid"],
  //     referrers: ["google.com"],
  //   },
  // );

  // console.log(JSON.stringify(result, null, 2));

  await prisma.fraudEvent.create({
    data: {
      id: createId({ prefix: "fraud_" }),
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      partnerId: "pn_1K9BZE1K2K6XHC2T5P5X9GN17",
      customerId: "cus_1K9WG32MAMWAASDZD2PFF3W1C",
      type: "referralSourceBanned"
    },
  });
}

main();
