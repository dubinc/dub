import { z } from "zod";

const fxQuoteSchema = z.object({
  rates: z.record(
    z.string(),
    z.object({
      exchange_rate: z.number(),
    }),
  ),
});

export async function createFxQuote({
  fromCurrency,
  toCurrency,
}: {
  fromCurrency: string;
  toCurrency: string;
}) {
  try {
    const body = new URLSearchParams();

    body.append("from_currencies[]", fromCurrency);
    body.append("to_currency", toCurrency);
    body.append("lock_duration", "none");

    const fxQuoteResponse = await fetch("https://api.stripe.com/v1/fx_quotes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2025-05-28.basil;fx_quote_preview=v1",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const fxQuote = await fxQuoteResponse.json();

    return fxQuoteSchema.parse(fxQuote);
  } catch (error) {
    throw new Error(
      `Failed to create FX quote for ${fromCurrency} to ${toCurrency}. ${JSON.stringify(error, null, 2)}`,
    );
  }
}
