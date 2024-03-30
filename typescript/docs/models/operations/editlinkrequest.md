# EditLinkRequest


## Fields

| Field                                                                            | Type                                                                             | Required                                                                         | Description                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `linkId`                                                                         | *string*                                                                         | :heavy_check_mark:                                                               | The id of the link to edit. You can get this via the `getLinkInfo` endpoint.     |
| `workspaceId`                                                                    | *string*                                                                         | :heavy_check_mark:                                                               | The ID of the workspace the link belongs to.                                     |
| `requestBody`                                                                    | [operations.EditLinkRequestBody](../../models/operations/editlinkrequestbody.md) | :heavy_minus_sign:                                                               | N/A                                                                              |