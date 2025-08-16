Alternatively, if you don't use Stripe's checkout session creation flow, you can also pass the user ID and the click event ID (`dub_id`) in the [Stripe customer creation flow](https://docs.stripe.com/api/customers/create).

When you [create a Stripe customer](https://docs.stripe.com/api/customers/create), pass the user's unique user ID in your database as the `dubCustomerId` value in the `metadata` field.

```javascript
import { stripe } from "@/lib/stripe";

const user = {
  id: "user_123",
  email: "user@example.com",
  teamId: "team_xxxxxxxxx",
};

const dub_id = req.headers.get("dub_id");

await stripe.customers.create({
  email: user.email,
  name: user.name,
  metadata: {
    dubCustomerId: user.id,
    dubClickId: dub_id,
  },
});
```

Alternatively, you can also pass the `dubCustomerId` and `dubClickId` values in the `metadata` field of the [Stripe customer update flow](https://docs.stripe.com/api/customers/update):

```javascript
import { stripe } from "@/lib/stripe";

const user = {
  id: "user_123",
  email: "user@example.com",
  teamId: "team_xxxxxxxxx",
};

const dub_id = req.headers.get("dub_id");

await stripe.customers.update(user.id, {
  metadata: {
    dubCustomerId: user.id,
    dubClickId: dub_id,
  },
});
```

This way, when the customer makes a purchase, Dub will automatically associate the purchase details (invoice amount, currency, etc.) with the original click event.
