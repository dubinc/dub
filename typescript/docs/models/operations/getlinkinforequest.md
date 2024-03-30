# GetLinkInfoRequest


## Fields

| Field                                                                             | Type                                                                              | Required                                                                          | Description                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `workspaceId`                                                                     | *string*                                                                          | :heavy_check_mark:                                                                | The ID of the workspace the link belongs to.                                      |
| `domain`                                                                          | *string*                                                                          | :heavy_check_mark:                                                                | The domain of the link to retrieve. E.g. for `d.to/github`, the domain is `d.to`. |
| `key`                                                                             | *string*                                                                          | :heavy_check_mark:                                                                | The key of the link to retrieve. E.g. for `d.to/github`, the key is `github`.     |