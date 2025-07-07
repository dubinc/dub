If you're using [Stripe Payment Links](https://docs.stripe.com/payment-links), simply add a `?dub_client_reference_id=1` query parameter to your Stripe Payment Link when shortening it on Dub.

Then, when a user clicks on the shortened link, Dub will automatically append the unique click ID as the `client_reference_id` [query parameter](https://docs.stripe.com/payment-links/url-parameters) to the payment link.

![Stripe payment link with Dub click ID](https://assets.dub.co/cms/conversions-payment-links.jpg)

Finally, when the user completes the checkout flow, Dub will automatically track the sale event and update the customer's `externalId` with their Stripe customer ID for future reference.

Alternatively, if you have a marketing site that you're redirecting your users to first, you can do this instead:

1. [Install the @dub/analytics client-side SDK](/sdks/client-side/introduction), which automatically detects the `dub_id` in the URL and stores it as a first-party cookie on your site.
2. Then, retrieve and append the `dub_id` value as the `client_reference_id` parameter to the payment links on your pricing page / CTA button (prefixed with `dub_id_`).

```javascript
https://buy.stripe.com/xxxxxx?client_reference_id=dub_id_xxxxxxxxxxxxxx
```

## What if I'm using Stripe Pricing Tables?

If you're using [Stripe Pricing Tables](https://docs.stripe.com/payments/checkout/pricing-table) – you'd want to pass the Dub click ID as a [`client-reference-id` attribute](https://docs.stripe.com/payments/checkout/pricing-table#handle-fulfillment-with-the-stripe-api) instead:

```html
<body>
  <h1>We offer plans that help any business!</h1>
  <!-- Paste your embed code script here. -->
  <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
  <stripe-pricing-table
    pricing-table-id="{{PRICING_TABLE_ID}}"
    publishable-key="pk_test_51ODHJvFacAXKeDpJsgWLQJSzBIDtCUFN6MoB4IIXKJDfWdFmiEO4JuvAU1A0Y2Ri4m4q1egIfwYy3s72cUBRCwXC00GQhEZuXa"
    client-reference-id="dub_id_xxxxxxxxxxxxxx"
  >
  </stripe-pricing-table>
</body>
```
