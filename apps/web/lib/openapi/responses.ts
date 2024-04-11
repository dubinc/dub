import { errorSchemaFactory } from "@/lib/api/errors";
import { ZodOpenApiComponentsObject } from "zod-openapi";

export const openApiErrorResponses: ZodOpenApiComponentsObject["responses"] = {
  "400": errorSchemaFactory(
    "bad_request",
    "The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).",
  ),

  "401": errorSchemaFactory(
    "unauthorized",
    `Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.`,
  ),

  "403": errorSchemaFactory(
    "forbidden",
    "The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server.",
  ),

  "404": errorSchemaFactory(
    "not_found",
    "The server cannot find the requested resource.",
  ),

  "409": errorSchemaFactory(
    "conflict",
    "This response is sent when a request conflicts with the current state of the server.",
  ),

  "410": errorSchemaFactory(
    "invite_expired",
    "This response is sent when the requested content has been permanently deleted from server, with no forwarding address.",
  ),

  "422": errorSchemaFactory(
    "unprocessable_entity",
    "The request was well-formed but was unable to be followed due to semantic errors.",
  ),

  "429": errorSchemaFactory(
    "rate_limit_exceeded",
    `The user has sent too many requests in a given amount of time ("rate limiting")`,
  ),

  "500": errorSchemaFactory(
    "internal_server_error",
    "The server has encountered a situation it does not know how to handle.",
  ),
};
