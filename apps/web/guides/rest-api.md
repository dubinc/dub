Dub's API is built on REST principles and is served over HTTPS. To ensure data privacy, unencrypted HTTP is not supported.

The Base URL for all API endpoints is:

```bash
https://api.dub.co
```

## Authentication

Authentication to Dub's API is performed via the Authorization header with a Bearer token. To authenticate, you need to include the Authorization header with the word `Bearer` followed by your API key in your requests like so:

```bash
Authorization: Bearer dub_xxxxxx
```

Here are examples of how to make a request to Dub's API using Node.js:

```javascript
const response = await fetch("https://api.dub.co/links", {
  method: "GET",
  headers: {
    Authorization: "Bearer dub_xxxxxx",
  },
});

const data = await response.json();
```
