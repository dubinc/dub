<!-- Start SDK Example Usage [usage] -->
```typescript
import { Dub } from "dub-node";

async function run() {
    const sdk = new Dub({
        bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
    });

    const result = await sdk.links.getLinks({
        workspaceId: "<value>",
        tagIds: "<value>",
    });

    // Handle the result
    console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->