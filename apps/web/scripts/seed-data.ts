import "dotenv-flow/config";

async function main() {
  const fakeEventName = [
    "Sign Up",
    "Created Account",
    "Added Payment Method",
    "Subscribed",
    "Started Trial",
  ];

  for (let i = 1; i <= 10; i++) {
    const response = await fetch(
      "http://localhost:8888/api/track/lead?workspaceId=ws_clv6iazq2003k8lh32eclix8l",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer iGjIsxS2OsMuQFaRdH5jZKNn`,
        },
        body: JSON.stringify({
          clickId: "efosj1dQU0NHZLQa",
          eventName:
            fakeEventName[Math.floor(Math.random() * fakeEventName.length)],
          customerId: `david-${i}`,
          customerName: `David ${i}`,
          customerEmail: `david-${i}@dub.co`,
        }),
      },
    );

    const data = await response.json();
    console.log(data);
  }

  // console.log("Token", process.env.TINYBIRD_API_KEY)
  // const clickEvent = await getClickEvent({ clickId });
  // console.log(clickEvent);

  // const clickData = clickEventSchemaTB
  //   .omit({ timestamp: true })
  //   .parse(clickEvent.data[0]);

  // const fakeEventName = [
  //   "Sign Up",
  //   "Created Account",
  //   "Added Payment Method",
  //   "Subscribed",
  //   "Started Trial",
  // ];

  // // Record leads
  // recordLead({
  //   ...clickData,
  //   event_id: nanoid(16),
  //   event_name: fakeEventName[Math.floor(Math.random() * fakeEventName.length)],
  //   customer_id: customerId,
  //   metadata: "",
  // });

  // const leadEvent = await getLeadEvent({ customerId });

  // const clickData = clickEventSchemaTB
  //   .omit({ timestamp: true })
  //   .parse(leadEvent.data[0]);

  // await recordSale(
  //   Array.from({ length: 420 }, () => ({
  //     ...clickData,
  //     // random timestamp between now and 30 days ago
  //     timestamp: new Date(
  //       Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
  //     ).toISOString(),
  //     customer_id: customerId,
  //     event_id: nanoid(16),
  //     payment_processor: "Stripe",
  //     product_id: "xxx",
  //     invoice_id: "xxx",
  //     // random amount between 2400 and 9900, in increments of 100
  //     amount: Math.floor(Math.random() * 75 + 24) * 100,
  //     currency: "usd",
  //     recurring: 1,
  //     recurring_interval: "monthly",
  //     recurring_interval_count: 1,
  //     refunded: 0,
  //     metadata: "",
  //   })),
  // );
}

main();
