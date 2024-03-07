import { errorSchemaFactory } from "@/lib/api/errors";

export const openApiErrorResponses = {
  400: {
    description:
      "The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).",
    content: {
      "application/json": {
        schema: errorSchemaFactory("bad_request"),
      },
    },
  },

  401: {
    description: `Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.`,
    content: {
      "application/json": {
        schema: errorSchemaFactory("unauthorized"),
      },
    },
  },

  403: {
    description:
      "The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("forbidden"),
      },
    },
  },

  404: {
    description: "The server cannot find the requested resource.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("not_found"),
      },
    },
  },

  409: {
    description:
      "This response is sent when a request conflicts with the current state of the server.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("conflict"),
      },
    },
  },

  410: {
    description:
      "This response is sent when the requested content has been permanently deleted from server, with no forwarding address.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("invite_expired"),
      },
    },
  },

  422: {
    description:
      "The request was well-formed but was unable to be followed due to semantic errors.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("unprocessable_entity"),
      },
    },
  },

  429: {
    description: `The user has sent too many requests in a given amount of time ("rate limiting")`,
    content: {
      "application/json": {
        schema: errorSchemaFactory("rate_limit_exceeded"),
      },
    },
  },

  500: {
    description:
      "The server has encountered a situation it does not know how to handle.",
    content: {
      "application/json": {
        schema: errorSchemaFactory("internal_server_error"),
      },
    },
  },
};
