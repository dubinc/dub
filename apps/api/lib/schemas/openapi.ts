import { toOpenAPIErrorSchema } from "../errors";

export const openApiErrorResponses = {
  400: {
    description:
      "The server cannot or will not process the request due to an apparent client error.",
    content: {
      "application/json": {
        schema: toOpenAPIErrorSchema("bad_request"),
      },
    },
  },
  401: {
    description:
      "The request has not been accepted because it lacks valid authentication credentials for the target resource.",
    content: {
      "application/json": {
        schema: toOpenAPIErrorSchema("unauthorized"),
      },
    },
  },
  403: {
    description:
      "The request was valid, but the server is refusing action. The user might not have the necessary permissions for a resource.",
    content: {
      "application/json": {
        schema: toOpenAPIErrorSchema("forbidden"),
      },
    },
  },
  404: {
    description: "The could not find the requested resource.",
    content: {
      "application/json": {
        schema: toOpenAPIErrorSchema("not_found"),
      },
    },
  },
  // 409: {
  //   description:
  //     "This response is sent when a request conflicts with the current state of the server.",
  //   content: {
  //     "application/json": {
  //       schema: toOpenAPIErrorSchema("not_found"),
  //     },
  //   },
  // },
  // 429: {
  //   description: `The user has sent too many requests in a given amount of time ("rate limiting")`,
  //   content: {
  //     "application/json": {
  //       schema: toOpenAPIErrorSchema("not_found"),
  //     },
  //   },
  // },
  500: {
    description:
      "The server has encountered a situation it does not know how to handle.",
    content: {
      "application/json": {
        schema: toOpenAPIErrorSchema("internal_server_error"),
      },
    },
  },
};
