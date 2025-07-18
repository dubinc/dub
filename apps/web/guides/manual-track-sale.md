You can also use Dub's [server-side SDKs](https://dub.co/docs/sdks/overview) or [REST API](https://dub.co/docs/api-reference/introduction) to track a sale event manually.

The example below demonstrates how to track a sale using the [Dub TypeScript SDK](https://dub.co/docs/sdks/typescript) in Node.js.

```typescript
import { Dub } from "dub";

const dub = new Dub({
  // optional, defaults to the DUB_API_KEY environment variable
  token: process.env.DUB_API_KEY,
});

await dub.track.sale({
  externalId: "cus_oFUYbZYqHFR0knk0MjsMC6b0",
  amount: 3000, // sale amount in cents
  currency: "usd",
  paymentProcessor: "stripe",
  eventName: "Invoice paid",
  invoiceId: "INV_1234567890",
});
```

If you want to use the REST API instead, you can refer to the following example:

```javascript
const response = await fetch("https://api.dub.co/track/sale", {
  method: "POST",
  headers: {
    Authorization: "Bearer dub_xxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    externalId: "cus_oFUYbZYqHFR0knk0MjsMC6b0",
    amount: 3000, // sale amount in cents
    paymentProcessor: "stripe",
    eventName: "Invoice paid",
    invoiceId: "INV_1234567890",
    currency: "usd",
  }),
});

const data = await response.json();
```

Make sure to include your API key in the Authorization header and pass the relevant sale data in the request body as JSON.

---

Refer to the [track sale API reference](https://dub.co/docs/api-reference/endpoint/track-sale) for details on available parameters and response formats.

Dub also supports server-side SDKs for other languages, including:

- [Python](https://dub.co/docs/sdks/python)
- [PHP](https://dub.co/docs/sdks/php)
- [Ruby](https://dub.co/docs/sdks/ruby)
- [Go](https://dub.co/docs/sdks/go)
