import { NextResponse } from "next/server";
import { OpenAPIV3 } from "openapi-types";

export const runtime = "edge";

export default async function handler(): Promise<
  NextResponse<OpenAPIV3.Document>
> {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "Dub.co API",
      description:
        "Dub is an open-source link management tool for modern marketing teams to create, share, and track short links.",
      contact: {
        email: "support@dub.co",
        name: "Dub.co Support",
        url: "https://dub.co/help",
      },
      version: "0.0.1",
    },
    servers: [
      {
        url: "https://api.dub.co",
        description: "Production API",
      },
    ],
    paths: {
      "/links": {
        get: {
          description:
            "Retrieve a list of links for the authenticated user or project. The list will be paginated and the provided query parameters allow filtering the returned links.",
          operationId: "getLinks",
          security: [
            {
              bearerToken: [],
            },
          ],
          summary: "Retrieve a list of links",
          parameters: [
            {
              name: "slug",
              description:
                "The slug for the project to retrieve links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The slug for the project to retrieve links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
            {
              name: "domain",
              description:
                "The domain to filter the links by. E.g. 'vercel.fyi' or 'stey.me'. If not provided, all links for the project will be returned.",
              in: "query",
              required: false,
              schema: {
                description:
                  "The domain to filter the links by. E.g. 'vercel.fyi' or 'stey.me'. If not provided, all links for the project will be returned.",
                type: "string",
              },
            },
            {
              name: "tagId",
              description: "The tag ID to filter the links by.",
              in: "query",
              required: false,
              schema: {
                description: "The tag ID to filter the links by.",
                type: "string",
              },
            },
            {
              name: "search",
              description:
                "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
              in: "query",
              required: false,
              schema: {
                description:
                  "The search term to filter the links by. The search term will be matched against the short link slug and the destination url.",
                type: "string",
              },
            },
            {
              name: "sort",
              description:
                "The field to sort the links by. The default is 'createdAt', and sort order is always descending.",
              in: "query",
              required: false,
              schema: {
                default: "createdAt",
                description:
                  "The field to sort the links by. The default is 'createdAt', and sort order is always descending.",
                type: "string",
                enum: ["createdAt", "clicks", "lastClicked"],
              },
            },
            {
              name: "page",
              description:
                "The page number for pagination (each page contains 100 links).",
              in: "query",
              required: false,
              schema: {
                description:
                  "The page number for pagination (each page contains 100 links).",
                type: "number",
              },
            },
            {
              name: "userId",
              description: "The user ID to filter the links by.",
              in: "query",
              required: false,
              schema: {
                description: "The user ID to filter the links by.",
                type: "string",
              },
            },
            {
              name: "showArchived",
              description:
                "Whether to include archived links in the response. Defaults to false if not provided.",
              in: "query",
              required: false,
              schema: {
                description:
                  "Whether to include archived links in the response. Defaults to false if not provided.",
                type: "boolean",
                enum: [true, false],
              },
            },
          ],
          responses: {
            "200": {
              description: "A list of links",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Link",
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          description:
            "Create a new link for the authenticated user or project.",
          operationId: "createLink",
          security: [
            {
              bearerToken: [],
            },
          ],
          summary: "Create a new link",
          parameters: [
            {
              name: "slug",
              description:
                "The slug for the project to create links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The slug for the project to create links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
          ],
          requestBody: {
            description: "Details of the link to create.",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LinkBody",
                  required: ["domain", "url"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The created link",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Link",
                  },
                },
              },
            },
          },
        },
      },
      "/links/{key}": {
        get: {
          description: "Retrieve a link for the authenticated user or project.",
          operationId: "getLink",
          security: [
            {
              bearerToken: [],
            },
          ],
          summary: "Retrieve a link",
          parameters: [
            {
              name: "key",
              description:
                "The key of the link to retrieve. E.g. for dub.sh/github, the key is 'github'.",
              in: "path",
              required: true,
              schema: {
                description:
                  "The key of the link to retrieve. E.g. for dub.sh/github, the key is 'github'.",
                type: "string",
              },
            },
            {
              name: "domain",
              description:
                "The domain of the link to retrieve. E.g. for dub.sh/github, the domain is 'dub.sh'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The domain of the link to retrieve. E.g. for dub.sh/github, the domain is 'dub.sh'.",
                type: "string",
              },
            },
            {
              name: "slug",
              description:
                "The project slug of the link to retrieve. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The project slug of the link to retrieve. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "The retrieved link",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Link",
                  },
                },
              },
            },
          },
        },
        put: {
          description: "Edit link for the authenticated user or project.",
          operationId: "editLink",
          security: [
            {
              bearerToken: [],
            },
          ],
          summary: "Edit a link",
          parameters: [
            {
              name: "key",
              description:
                "The key of the link to edit. E.g. for dub.sh/github, the key is 'github'.",
              in: "path",
              required: true,
              schema: {
                description:
                  "The key of the link to edit. E.g. for dub.sh/github, the key is 'github'.",
                type: "string",
              },
            },
            {
              name: "domain",
              description:
                "The domain of the link to edit. E.g. for dub.sh/github, the domain is 'dub.sh'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The domain of the link to edit. E.g. for dub.sh/github, the domain is 'dub.sh'.",
                type: "string",
              },
            },
            {
              name: "slug",
              description:
                "The project slug of the link to edit. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The project slug of the link to edit. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
          ],
          requestBody: {
            description: "Details of the link to edit.",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LinkBody",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The edited link",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Link",
                  },
                },
              },
            },
          },
        },
        delete: {
          description: "Delete a link for the authenticated user or project.",
          operationId: "deleteLink",
          security: [
            {
              bearerToken: [],
            },
          ],
          summary: "Delete a link",
          parameters: [
            {
              name: "key",
              description:
                "The key of the link to delete. E.g. for dub.sh/github, the key is 'github'.",
              in: "path",
              required: true,
              schema: {
                description:
                  "The key of the link to delete. E.g. for dub.sh/github, the key is 'github'.",
                type: "string",
              },
            },
            {
              name: "domain",
              description:
                "The domain of the link to delete. E.g. for dub.sh/github, the domain is 'dub.sh'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The domain of the link to delete. E.g. for dub.sh/github, the domain is 'dub.sh'.",
                type: "string",
              },
            },
            {
              name: "slug",
              description:
                "The project slug of the link to delete. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The project slug of the link to delete. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "The deleted link",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Link",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Link: {
          allOf: [
            {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "cuid",
                  description: "The unique ID of the short link.",
                },
              },
            },
            {
              $ref: "#/components/schemas/LinkBody",
            },
            {
              $ref: "#/components/schemas/LinkResponse",
            },
          ],
        },
        LinkBody: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "The domain of the short link.",
            },
            key: {
              type: "string",
              description:
                "The short link slug. If not provided, a random 7-character slug will be generated.",
            },
            url: {
              type: "string",
              description: "The destination URL of the short link.",
            },
            archived: {
              type: "boolean",
              description: "Whether the short link is archived.",
              default: false,
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              description: "The date and time when the short link will expire.",
              default: null,
              nullable: true,
            },
            password: {
              type: "string",
              description:
                "The password required to access the destination URL of the short link.",
              default: null,
              nullable: true,
            },
            proxy: {
              type: "boolean",
              description:
                "Whether the short link uses Custom Social Media Cards feature.",
              default: false,
            },
            title: {
              type: "string",
              description:
                "The title of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
              default: null,
              nullable: true,
            },
            description: {
              type: "string",
              description:
                "The description of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
              default: null,
              nullable: true,
            },
            image: {
              type: "string",
              description:
                "The image of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
              default: null,
              nullable: true,
            },
            rewrite: {
              type: "boolean",
              description: "Whether the short link uses link cloaking.",
              default: false,
            },
            ios: {
              type: "string",
              description:
                "The iOS destination URL for the short link for iOS device targeting.",
              default: null,
              nullable: true,
            },
            android: {
              type: "string",
              description:
                "The Android destination URL for the short link for Android device targeting.",
              default: null,
              nullable: true,
            },
            geo: {
              type: "object",
              description: "Geo targeting information for the short link.",
              additionalProperties: {
                type: "string",
                format: "uri",
              },
              default: null,
              nullable: true,
            },
            publicStats: {
              type: "boolean",
              description:
                "Whether the short link's stats are publicly accessible.",
              default: false,
            },
            tagId: {
              type: "string",
              format: "cuid",
              description:
                "The unique id of the tag assigned to the short link.",
              default: null,
              nullable: true,
            },
            comments: {
              type: "string",
              description: "The comments for the short link.",
              default: null,
              nullable: true,
            },
          },
        },
        LinkResponse: {
          type: "object",
          properties: {
            utm_source: {
              type: "string",
              description: "The UTM source of the short link.",
              default: null,
              nullable: true,
            },
            utm_medium: {
              type: "string",
              description: "The UTM medium of the short link.",
              default: null,
              nullable: true,
            },
            utm_campaign: {
              type: "string",
              description: "The UTM campaign of the short link.",
              default: null,
              nullable: true,
            },
            utm_term: {
              type: "string",
              description: "The UTM term of the short link.",
              default: null,
              nullable: true,
            },
            utm_content: {
              type: "string",
              description: "The UTM content of the short link.",
              default: null,
              nullable: true,
            },
            userId: {
              type: "string",
              format: "cuid",
              description: "The user ID of the creator of the short link.",
            },
            projectId: {
              type: "string",
              format: "cuid",
              description: "The project ID of the short link.",
            },
            clicks: {
              type: "number",
              description: "The number of clicks on the short link.",
              default: 0,
              readOnly: true,
            },
            lastClicked: {
              type: "string",
              format: "date-time",
              description:
                "The date and time when the short link was last clicked.",
              default: null,
              nullable: true,
              readOnly: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "The date and time when the short link was created.",
              readOnly: true,
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description:
                "The date and time when the short link was last updated.",
              readOnly: true,
            },
          },
        },
      },
      securitySchemes: {
        bearerToken: {
          type: "http",
          description: "Default authentication mechanism",
          scheme: "bearer",
        },
      },
    },
  });
}
