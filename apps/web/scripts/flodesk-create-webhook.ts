import "dotenv-flow/config";

async function main() {
  const res = await fetch("https://api.flodesk.com/v1/webhooks", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.FLODESK_API_KEY}`,
    },
    // body: JSON.stringify({
    //   name: "Unsubscribed Webhook",
    //   post_url:
    //     "https://app.dub.co/api/callback/flodesk?token=9155f7737cd484b668fc4d4ba0532eef",
    //   events: ["subscriber.unsubscribed"],
    // }),
    // }).then((res) => ({
    //   limit: res.headers.get("X-Fd-RateLimit-Limit"),
    //   remaining: res.headers.get("X-Fd-RateLimit-Remaining"),
    // }));
  }).then((res) => res.json());

  console.log(JSON.stringify(res, null, 2));
}

main();
