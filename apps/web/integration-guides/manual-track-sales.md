If you prefer not to use the SDK, you can interact directly with Dub’s REST API to track sales.

The example below demonstrates how to track a sale using a POST request in Node.js.

Make sure to include your API key in the Authorization header and pass the relevant sale data in the request body as JSON.

```javascript
const response = await fetch("https://api.dub.co/track/sale", {
  method: "POST",
  headers: {
    Authorization: "Bearer dub_xxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    externalId: "cus_oFUYbZYqHFR0knk0MjsMC6b0",
    amount: 3000,
    paymentProcessor: "custom",
    eventName: "Invoice paid",
    invoiceId: "INV_1234567890",
    currency: "usd",
  }),
});

const data = await response.json();
```

Refer to the [API reference](https://dub.co/docs/api-reference/endpoint/track-sale) for details on available parameters and response formats.
