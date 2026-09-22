/**
 *
 * Thin Cloudflare Worker: queue push → forward each R2 notification to Next.js.
 * Magic-byte validation + quarantine live in Next.js, not here.
 *
 * - Variable DUB_WEBHOOK_URL  e.g. https://app.dub.co/api/cloudflare/webhook/r2-object-created
 * - Secret CLOUDFLARE_WORKER_WEBHOOK_SECRET  (same value as Next.js env)
 */

function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  if (body && typeof body === "object") {
    return body;
  }

  throw new Error("Unexpected queue message body type");
}

async function forwardToNextjs(env, notification) {
  const url = env.DUB_WEBHOOK_URL;
  const secret = env.CLOUDFLARE_WORKER_WEBHOOK_SECRET;

  if (!url || !secret) {
    throw new Error(
      "DUB_WEBHOOK_URL and CLOUDFLARE_WORKER_WEBHOOK_SECRET must be set",
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notification }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Next.js webhook failed (${response.status}): ${text.slice(0, 500)}`,
    );
  }

  return response.json().catch(() => ({}));
}

export default {
  async fetch() {
    return new Response("r2-object-created forwarder ok");
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const notification = parseBody(message.body);
        const result = await forwardToNextjs(env, notification);
        console.info("forwarded r2 notification", {
          key: notification?.object?.key,
          result,
        });
        message.ack();
      } catch (error) {
        console.error("forward failed", error);
        message.retry();
      }
    }
  },
};
