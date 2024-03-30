# dub-node

<div align="left">
    <a href="https://speakeasyapi.dev/"><img src="https://custom-icon-badges.demolab.com/badge/-Built%20By%20Speakeasy-212015?style=for-the-badge&logoColor=FBE331&logo=speakeasy&labelColor=545454" /></a>
    <a href="https://opensource.org/licenses/MIT">
        <img src="https://img.shields.io/badge/License-MIT-blue.svg" style="width: 100px; height: 28px;" />
    </a>
</div>


## 🏗 **Welcome to your new SDK!** 🏗

It has been generated successfully based on your OpenAPI spec. However, it is not yet ready for production use. Here are some next steps:
- [ ] 🛠 Make your SDK feel handcrafted by [customizing it](https://www.speakeasyapi.dev/docs/customize-sdks)
- [ ] ♻️ Refine your SDK quickly by iterating locally with the [Speakeasy CLI](https://github.com/speakeasy-api/speakeasy)
- [ ] 🎁 Publish your SDK to package managers by [configuring automatic publishing](https://www.speakeasyapi.dev/docs/advanced-setup/publish-sdks)
- [ ] ✨ When ready to productionize, delete this section from the README

<!-- Start SDK Installation [installation] -->
## SDK Installation

### NPM

```bash
npm add <UNSET>
```

### Yarn

```bash
yarn add <UNSET>
```
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

For supported JavaScript runtimes, please consult [RUNTIMES.md](RUNTIMES.md).
<!-- End Requirements [requirements] -->

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Example

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

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

### [links](docs/sdks/links/README.md)

* [getLinks](docs/sdks/links/README.md#getlinks) - Retrieve a list of links
* [createLink](docs/sdks/links/README.md#createlink) - Create a new link
* [getLinksCount](docs/sdks/links/README.md#getlinkscount) - Retrieve the number of links
* [getLinkInfo](docs/sdks/links/README.md#getlinkinfo) - Retrieve a link
* [editLink](docs/sdks/links/README.md#editlink) - Edit a link
* [deleteLink](docs/sdks/links/README.md#deletelink) - Delete a link
* [bulkCreateLinks](docs/sdks/links/README.md#bulkcreatelinks) - Bulk create links

### [qrCodes](docs/sdks/qrcodes/README.md)

* [getQRCode](docs/sdks/qrcodes/README.md#getqrcode) - Retrieve a QR code

### [analytics](docs/sdks/analytics/README.md)

* [getClicksAnalytics](docs/sdks/analytics/README.md#getclicksanalytics) - Retrieve clicks analytics
* [getTimeseriesAnalytics](docs/sdks/analytics/README.md#gettimeseriesanalytics) - Retrieve timeseries analytics
* [getCountryAnalytics](docs/sdks/analytics/README.md#getcountryanalytics) - Retrieve country analytics
* [getCityAnalytics](docs/sdks/analytics/README.md#getcityanalytics) - Retrieve city analytics
* [getDeviceAnalytics](docs/sdks/analytics/README.md#getdeviceanalytics) - Retrieve device analytics
* [getBrowserAnalytics](docs/sdks/analytics/README.md#getbrowseranalytics) - Retrieve browser analytics
* [getOSAnalytics](docs/sdks/analytics/README.md#getosanalytics) - Retrieve OS analytics
* [getRefererAnalytics](docs/sdks/analytics/README.md#getrefereranalytics) - Retrieve referer analytics
* [getTopLinks](docs/sdks/analytics/README.md#gettoplinks) - Retrieve top links
* [getTopURLs](docs/sdks/analytics/README.md#gettopurls) - Retrieve top URLs

### [workspaces](docs/sdks/workspaces/README.md)

* [getWorkspaces](docs/sdks/workspaces/README.md#getworkspaces) - Retrieve a list of workspaces
* [createWorkspace](docs/sdks/workspaces/README.md#createworkspace) - Create a workspace
* [getWorkspace](docs/sdks/workspaces/README.md#getworkspace) - Retrieve a workspace

### [tags](docs/sdks/tags/README.md)

* [getTags](docs/sdks/tags/README.md#gettags) - Retrieve a list of tags
* [createTag](docs/sdks/tags/README.md#createtag) - Create a new tag
<!-- End Available Resources and Operations [operations] -->

<!-- Start Error Handling [errors] -->
## Error Handling

All SDK methods return a response object or throw an error. If Error objects are specified in your OpenAPI Spec, the SDK will throw the appropriate Error type.

| Error Object                    | Status Code                     | Content Type                    |
| ------------------------------- | ------------------------------- | ------------------------------- |
| errors.FourHundred              | 400                             | application/json                |
| errors.FourHundredAndOne        | 401                             | application/json                |
| errors.FourHundredAndThree      | 403                             | application/json                |
| errors.FourHundredAndFour       | 404                             | application/json                |
| errors.FourHundredAndNine       | 409                             | application/json                |
| errors.FourHundredAndTen        | 410                             | application/json                |
| errors.FourHundredAndTwentyTwo  | 422                             | application/json                |
| errors.FourHundredAndTwentyNine | 429                             | application/json                |
| errors.FiveHundred              | 500                             | application/json                |
| errors.SDKError                 | 4xx-5xx                         | */*                             |

Validation errors can also occur when either method arguments or data returned from the server do not match the expected format. The `SDKValidationError` that is thrown as a result will capture the raw value that failed validation in an attribute called `rawValue`. Additionally, a `pretty()` method is available on this error that can be used to log a nicely formatted string since validation errors can list many issues and the plain error string may be difficult read when debugging. 


```typescript
import { Dub } from "dub-node";
import * as errors from "dub-node/models/errors";

async function run() {
    const sdk = new Dub({
        bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
    });

    let result;
    try {
        result = await sdk.links.getLinks({
            workspaceId: "<value>",
            tagIds: "<value>",
        });
    } catch (err) {
        switch (true) {
            case err instanceof errors.SDKValidationError: {
                // Validation errors can be pretty-printed
                console.error(err.pretty());
                // Raw value may also be inspected
                console.error(err.rawValue);
                return;
            }
            case err instanceof errors.FourHundred: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndOne: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndThree: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndFour: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndNine: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndTen: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndTwentyTwo: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FourHundredAndTwentyNine: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.FiveHundred: {
                console.error(err); // handle exception
                return;
            }
            default: {
                throw err;
            }
        }
    }

    // Handle the result
    console.log(result);
}

run();

```
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Select Server by Index

You can override the default server globally by passing a server index to the `serverIdx` optional parameter when initializing the SDK client instance. The selected server will then be used as the default on the operations that use it. This table lists the indexes associated with the available servers:

| # | Server | Variables |
| - | ------ | --------- |
| 0 | `https://api.dub.co` | None |

```typescript
import { Dub } from "dub-node";

async function run() {
    const sdk = new Dub({
        serverIdx: 0,
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


### Override Server URL Per-Client

The default server can also be overridden globally by passing a URL to the `serverURL` optional parameter when initializing the SDK client instance. For example:

```typescript
import { Dub } from "dub-node";

async function run() {
    const sdk = new Dub({
        serverURL: "https://api.dub.co",
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
<!-- End Server Selection [server] -->

<!-- Start Custom HTTP Client [http-client] -->
## Custom HTTP Client

The TypeScript SDK makes API calls using an `HTTPClient` that wraps the native
[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). This
client is a thin wrapper around `fetch` and provides the ability to attach hooks
around the request lifecycle that can be used to modify the request or handle
errors and response.

The `HTTPClient` constructor takes an optional `fetcher` argument that can be
used to integrate a third-party HTTP client or when writing tests to mock out
the HTTP client and feed in fixtures.

The following example shows how to use the `"beforeRequest"` hook to to add a
custom header and a timeout to requests and how to use the `"requestError"` hook
to log errors:

```typescript
import { Dub } from "dub-node";
import { HTTPClient } from "dub-node/lib/http";

const httpClient = new HTTPClient({
  // fetcher takes a function that has the same signature as native `fetch`.
  fetcher: (request) => {
    return fetch(request);
  }
});

httpClient.addHook("beforeRequest", (request) => {
  const nextRequest = new Request(request, {
    signal: request.signal || AbortSignal.timeout(5000);
  });

  nextRequest.headers.set("x-custom-header", "custom value");

  return nextRequest;
});

httpClient.addHook("requestError", (error, request) => {
  console.group("Request Error");
  console.log("Reason:", `${error}`);
  console.log("Endpoint:", `${request.method} ${request.url}`);
  console.groupEnd();
});

const sdk = new Dub({ httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Start Authentication [security] -->
## Authentication

### Per-Client Security Schemes

This SDK supports the following security scheme globally:

| Name          | Type          | Scheme        |
| ------------- | ------------- | ------------- |
| `bearerToken` | http          | HTTP Bearer   |

To authenticate with the API the `bearerToken` parameter must be set when initializing the SDK client instance. For example:
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
<!-- End Authentication [security] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

# Development

## Maturity

This SDK is in beta, and there may be breaking changes between versions without a major version update. Therefore, we recommend pinning usage
to a specific package version. This way, you can install the same version each time without breaking changes unless you are intentionally
looking for the latest version.

## Contributions

While we value open-source contributions to this SDK, this library is generated programmatically.
Feel free to open a PR or a Github issue as a proof of concept and we'll do our best to include it in a future release!

### SDK Created by [Speakeasy](https://docs.speakeasyapi.dev/docs/using-speakeasy/client-sdks)
