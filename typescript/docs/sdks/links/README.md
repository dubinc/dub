# Links
(*links*)

### Available Operations

* [getLinks](#getlinks) - Retrieve a list of links
* [createLink](#createlink) - Create a new link
* [getLinksCount](#getlinkscount) - Retrieve the number of links
* [getLinkInfo](#getlinkinfo) - Retrieve a link
* [editLink](#editlink) - Edit a link
* [deleteLink](#deletelink) - Delete a link
* [bulkCreateLinks](#bulkcreatelinks) - Bulk create links

## getLinks

Retrieve a list of links for the authenticated workspace. The list will be paginated and the provided query parameters allow filtering the returned links.

### Example Usage

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
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetLinksRequest](../../models/operations/getlinksrequest.md)                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema[]](../../models/.md)>**
### Errors

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

## createLink

Create a new link for the authenticated workspace.

### Example Usage

```typescript
import { Dub } from "dub-node";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const workspaceId = "<value>";
  const requestBody = {
    url: "https://first-marxism.net",
    geo: {
      "key": "<value>",
    },
  tagIds: "<value>",
  };
  
  const result = await sdk.links.createLink(workspaceId, requestBody);

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaceId`                                                                                                                                                                  | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The ID of the workspace to create the link for.                                                                                                                                |
| `requestBody`                                                                                                                                                                  | [operations.CreateLinkRequestBody](../../models/operations/createlinkrequestbody.md)                                                                                           | :heavy_minus_sign:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema](../../models/components/linkschema.md)>**
### Errors

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

## getLinksCount

Retrieve the number of links for the authenticated workspace. The provided query parameters allow filtering the returned links.

### Example Usage

```typescript
import { Dub } from "dub-node";
import { Two } from "dub-node/models/operations";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const result = await sdk.links.getLinksCount({
    workspaceId: "<value>",
  tagIds:     [
        "<value>",
      ],
  groupBy: Two.TagId,
  });

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.GetLinksCountRequest](../../models/operations/getlinkscountrequest.md)                                                                                             | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema[]](../../models/.md)>**
### Errors

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

## getLinkInfo

Retrieve the info for a link from their domain and key.

### Example Usage

```typescript
import { Dub } from "dub-node";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const workspaceId = "<value>";
  const domain = "<value>";
  const key = "<value>";
  
  const result = await sdk.links.getLinkInfo(workspaceId, domain, key);

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaceId`                                                                                                                                                                  | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The ID of the workspace the link belongs to.                                                                                                                                   |
| `domain`                                                                                                                                                                       | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The domain of the link to retrieve. E.g. for `d.to/github`, the domain is `d.to`.                                                                                              |
| `key`                                                                                                                                                                          | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The key of the link to retrieve. E.g. for `d.to/github`, the key is `github`.                                                                                                  |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema](../../models/components/linkschema.md)>**
### Errors

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

## editLink

Edit a link for the authenticated workspace.

### Example Usage

```typescript
import { Dub } from "dub-node";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const linkId = "<value>";
  const workspaceId = "<value>";
  const requestBody = {
    url: "https://fruitful-strategy.com",
    geo: {
      "key": "<value>",
    },
  tagIds: "<value>",
  };
  
  const result = await sdk.links.editLink(linkId, workspaceId, requestBody);

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linkId`                                                                                                                                                                       | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The id of the link to edit. You can get this via the `getLinkInfo` endpoint.                                                                                                   |
| `workspaceId`                                                                                                                                                                  | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The ID of the workspace the link belongs to.                                                                                                                                   |
| `requestBody`                                                                                                                                                                  | [operations.EditLinkRequestBody](../../models/operations/editlinkrequestbody.md)                                                                                               | :heavy_minus_sign:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema](../../models/components/linkschema.md)>**
### Errors

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

## deleteLink

Delete a link for the authenticated workspace.

### Example Usage

```typescript
import { Dub } from "dub-node";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const linkId = "<value>";
  const workspaceId = "<value>";
  
  const result = await sdk.links.deleteLink(linkId, workspaceId);

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linkId`                                                                                                                                                                       | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The id of the link to delete. You can get this via the `getLinkInfo` endpoint.                                                                                                 |
| `workspaceId`                                                                                                                                                                  | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The ID of the workspace the link belongs to.                                                                                                                                   |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema](../../models/components/linkschema.md)>**
### Errors

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

## bulkCreateLinks

Bulk create up to 100 links for the authenticated workspace.

### Example Usage

```typescript
import { Dub } from "dub-node";

async function run() {
  const sdk = new Dub({
    bearerToken: "<YOUR_BEARER_TOKEN_HERE>",
  });

  const workspaceId = "<value>";
  const requestBody = [
    {
      url: "https://impish-brow.info",
      geo: {
        "key": "<value>",
      },
    tagIds: "<value>",
    },
  ];
  
  const result = await sdk.links.bulkCreateLinks(workspaceId, requestBody);

  // Handle the result
  console.log(result)
}

run();
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaceId`                                                                                                                                                                  | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | The ID of the workspace to create the link for.                                                                                                                                |
| `requestBody`                                                                                                                                                                  | [operations.RequestBody](../../models/operations/requestbody.md)[]                                                                                                             | :heavy_minus_sign:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |


### Response

**Promise<[components.LinkSchema[]](../../models/.md)>**
### Errors

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
