import { nanoid } from "@dub/utils";
import "dotenv-flow/config";

const links = [
  {
    id: "clqo10sum0006js08vutzfxt3",
    shortLink: "d.to/try",
    url: "https://app.dub.co/",
    domain: "d.to",
  },
  {
    id: "clvpdmrx40008i19yee46djta",
    shortLink: "d.to/brand",
    url: "https://dub.co/brand",
    domain: "d.to",
  },
  {
    id: "clvl08a4r0001itsl3shc931x",
    shortLink: "d.to/gallery",
    url: "https://dub.co/blog/product-discovery-platform",
    domain: "d.to",
  },
  {
    id: "clu718gfe0001tfinipqgznrz",
    shortLink: "d.to/playbook",
    url: "https://dub.co/blog/product-hunt",
    domain: "d.to",
  },
  {
    id: "clur35t670003ux28e0cgxjjc",
    shortLink: "d.to/datetime",
    url: "https://dub.co/blog/smart-datetime-picker",
    domain: "d.to",
  },
];

const countries = [
  { continent: "NA", country: "US" },
  { continent: "AS", country: "IN" },
  { continent: "EU", country: "DE" },
  { continent: "EU", country: "FR" },
  { continent: "EU", country: "GB" },
  { continent: "EU", country: "NL" },
  { continent: "AS", country: "SG" },
  { continent: "NA", country: "CA" },
  { continent: "OC", country: "AU" },
  { continent: "SA", country: "BR" },
];

const devices = ["Desktop", "Mobile", "Tablet"];

async function main() {
  await seedLinkMetadata();
  await seedClicks();
  await seedLeads(3269);
  await seedSales(50);
}

// Seed link metadata
async function seedLinkMetadata() {
  for (let i = 0; i < 5; i++) {
    const link = links[i];

    fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_links_metadata&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_DEMO_API_KEY}`,
        },
        body: JSON.stringify({
          timestamp: Date.now(),
          link_id: link.id,
          domain: link.domain,
          key: link.shortLink.split("/")[1],
          url: link.url,
          tag_ids: [],
          workspace_id: "ws_cl7pj5kq4006835rbjlt2ofka",
          created_at: new Date().toISOString(),
          deleted: 0,
        }),
      },
    );
  }
}

// Seed click events
async function seedClicks(count = 10000) {
  const data = Array.from({ length: count }).map(() => {
    const link = links[Math.floor(Math.random() * links.length)];
    const { country, continent } =
      countries[Math.floor(Math.random() * countries.length)];

    return {
      timestamp: new Date(
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      ).toISOString(),
      click_id: nanoid(16),
      link_id: link.id,
      url: link.url,
      country,
      continent,
      device: devices[Math.floor(Math.random() * devices.length)],
      alias_link_id: "",
      ip: "63.141.57.109",
      city: "San Francisco",
      region: "CA",
      latitude: "37.7695",
      longitude: "-122.385",
      device_vendor: "Apple",
      device_model: "Macintosh",
      browser: "Chrome",
      browser_version: "124.0.0.0",
      engine: "Blink",
      engine_version: "124.0.0.0",
      os: "Mac OS",
      os_version: "10.15.7",
      cpu_architecture: "Unknown",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      bot: 0,
      qr: 0,
      referer: "(direct)",
      referer_url: "(direct)",
    };
  });

  const ndjson = data.map((event) => JSON.stringify(event)).join("\n");

  const response = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_DEMO_API_KEY}`,
      },
      body: ndjson,
    },
  );

  const sent = await response.json();

  console.log("dub_click_events", sent);
}

// Seed lead events
async function seedLeads(count = 10) {
  const data = Array.from({ length: count }).map(() => {
    const link = links[Math.floor(Math.random() * links.length)];
    const { country, continent } =
      countries[Math.floor(Math.random() * countries.length)];

    return {
      // random date in the last 30 days
      timestamp: new Date(
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      ).toISOString(),
      event_id: nanoid(16),
      event_name: "Signup",
      customer_id: "xxxx",
      click_id: nanoid(16),
      link_id: link.id,
      url: link.url,
      country,
      continent,
      device: devices[Math.floor(Math.random() * devices.length)],
      metadata: "",
      ip: "63.141.57.109",
      city: "San Francisco",
      region: "CA",
      latitude: "37.7695",
      longitude: "-122.385",
      device_vendor: "Apple",
      device_model: "Macintosh",
      browser: "Chrome",
      browser_version: "124.0.0.0",
      engine: "Blink",
      engine_version: "124.0.0.0",
      os: "Mac OS",
      os_version: "10.15.7",
      cpu_architecture: "Unknown",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      bot: 0,
      qr: 0,
      referer: "(direct)",
      referer_url: "(direct)",
    };
  });

  const ndjson = data.map((event) => JSON.stringify(event)).join("\n");

  const response = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_lead_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_DEMO_API_KEY}`,
      },
      body: ndjson,
    },
  );

  const sent = await response.json();

  console.log("dub_lead_events", sent);
}

// Seed sales events
async function seedSales(count = 5) {
  const data = Array.from({ length: count }).map(() => {
    const link = links[Math.floor(Math.random() * links.length)];
    const { country, continent } =
      countries[Math.floor(Math.random() * countries.length)];

    return {
      // random date in the last 30 days
      timestamp: new Date(
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      ).toISOString(),
      event_id: nanoid(16),
      event_name: "Subscription creation",
      customer_id: "xxxx",
      click_id: nanoid(16),
      link_id: link.id,
      url: link.url,
      country,
      continent,
      device: devices[Math.floor(Math.random() * devices.length)],
      invoice_id: nanoid(16),
      // random amount between $24 and $99
      amount: Math.floor(Math.random() * 75 + 24) * 100,
      currency: "USD",
      payment_processor: "stripe",
      metadata: "",
      ip: "63.141.57.109",
      city: "San Francisco",
      region: "CA",
      latitude: "37.7695",
      longitude: "-122.385",
      device_vendor: "Apple",
      device_model: "Macintosh",
      browser: "Chrome",
      browser_version: "124.0.0.0",
      engine: "Blink",
      engine_version: "124.0.0.0",
      os: "Mac OS",
      os_version: "10.15.7",
      cpu_architecture: "Unknown",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      bot: 0,
      qr: 0,
      referer: "(direct)",
      referer_url: "(direct)",
    };
  });

  const ndjson = data.map((event) => JSON.stringify(event)).join("\n");

  const response = await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_sale_events&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_DEMO_API_KEY}`,
      },
      body: ndjson,
    },
  );

  const sent = await response.json();

  console.log("dub_sale_events", sent);
}

main();
