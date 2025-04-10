const relevantEvents = new Set(["PAYMENT.PAYOUTS-ITEM.SUCCEEDED"]);

// POST /api/shopify/integration/webhook – Listen to Shopify webhook events
export const POST = async (req: Request) => {
  const data = await req.text();
  const headers = req.headers;

  // TODO:
  // Verify signature

  return new Response("OK");
};
