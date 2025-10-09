# Stripe App

This is the [Stripe app](https://marketplace.stripe.com/apps/dub-conversions) for Dub Conversions.

## Publish new version

1. Run `stripe login` in your terminal and sign in to `Dub Technologies, Inc.`.
2. Navigate to the `packages/stripe-app` directory.
3. Increment the `version` field in `stripe-app.json`.
4. Upload the updated app using `stripe apps upload`.
5. Publish the new version via the [Stripe dashboard](https://dashboard.stripe.com/apps/dub.co).

## Run locally

```
stripe apps start
```
