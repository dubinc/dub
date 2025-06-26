If you prefer not to use the SDK, you can interact directly with Dub’s REST API to track leads.

The example below demonstrates how to track a lead using a POST request in Node.js.

Make sure to include your API key in the Authorization header and pass the relevant lead data in the request body as JSON.

```javascript
const response = await fetch("https://api.dub.co/track/lead", {
  method: "POST",
  headers: {
    Authorization: "Bearer dub_xxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clickId: "rLnWe1uz9t282v7g",
    eventName: "Sign up",
    externalId: "cus_oFUYbZYqHFR0knk0MjsMC6b0",
    customerName: "John Doe",
    customerEmail: "john.doe@example.com",
  }),
});

const data = await response.json();
```

Refer to the [API reference](https://dub.co/docs/api-reference/endpoint/track-lead) for details on available parameters and response formats.
