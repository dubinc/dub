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
      {
        url: "https://api.dub.sh",
        description: "Staging API",
      },
    ],
    paths: {
      "/links": {
        get: {
          description:
            "Allows to retrieve the list of links of the authenticated user or project. The list will be paginated and the provided query parameters allow filtering the returned projects.",
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
            "Allows to create a new link for the authenticated user or project.",
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
                "The slug for the project to retrieve links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
              in: "query",
              required: true,
              schema: {
                description:
                  "The slug for the project to retrieve links for. E.g. for app.dub.co/vercel, the slug is 'vercel'.",
                type: "string",
              },
            },
          ],
          requestBody: {
            description: "The link to create.",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Link",
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
        delete: {
          description:
            "Allows to delete a link for the authenticated user or project.",
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
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "cuid",
              description: "The unique ID of the short link.",
            },
            domain: {
              type: "string",
              description: "The domain of the short link.",
            },
            key: {
              type: "string",
              description: "The short link slug.",
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
              nullable: true,
            },
            password: {
              type: "string",
              description:
                "The password required to access the destination URL of the short link.",
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
              nullable: true,
            },
            description: {
              type: "string",
              description:
                "The description of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
              nullable: true,
            },
            image: {
              type: "string",
              description:
                "The image of the short link generated via api.dub.co/metatags. Will be used for Custom Social Media Cards if `proxy` is true.",
              nullable: true,
            },
            utm_source: {
              type: "string",
              description: "The UTM source of the short link.",
              nullable: true,
            },
            utm_medium: {
              type: "string",
              description: "The UTM medium of the short link.",
              nullable: true,
            },
            utm_campaign: {
              type: "string",
              description: "The UTM campaign of the short link.",
              nullable: true,
            },
            utm_term: {
              type: "string",
              description: "The UTM term of the short link.",
              nullable: true,
            },
            utm_content: {
              type: "string",
              description: "The UTM content of the short link.",
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
              nullable: true,
            },
            android: {
              type: "string",
              description:
                "The Android destination URL for the short link for Android device targeting.",
              nullable: true,
            },
            geo: {
              type: "object",
              description: "Geo targeting information for the short link.",
              additionalProperties: {
                type: "string",
                format: "uri",
              },
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
            publicStats: {
              type: "boolean",
              description:
                "Whether the short link's stats are publicly accessible.",
              default: false,
            },
            clicks: {
              type: "number",
              description: "The number of clicks on the short link.",
              default: 0,
            },
            lastClicked: {
              type: "string",
              format: "date-time",
              description:
                "The date and time when the short link was last clicked.",
              nullable: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "The date and time when the short link was created.",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description:
                "The date and time when the short link was last updated.",
            },
            tagId: {
              type: "string",
              format: "cuid",
              description:
                "The unique id of the tag assigned to the short link.",
              nullable: true,
            },
            comments: {
              type: "string",
              description: "The comments for the short link.",
              nullable: true,
            },
          },
        },
      },
    },
  });
}
