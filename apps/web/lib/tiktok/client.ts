import { HttpBaseClient } from "@/lib/http/base-client";
import { getUserInfoInputSchema, getUserInfoOutputSchema } from "./schema";

export class TikTokClient extends HttpBaseClient {
  protected readonly vendor = "TikTok";
  protected readonly baseUrl = "https://open.tiktokapis.com/v2";
  protected readonly logResponseBodies = false;

  private readonly accessToken: string;

  constructor({ accessToken }: { accessToken: string }) {
    super();
    this.accessToken = accessToken;
  }

  protected buildAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  // GET /v2/user/info/?fields=
  async getUserInfo() {
    return await this.get("/user/info/", {
      inputSchema: getUserInfoInputSchema,
      outputSchema: getUserInfoOutputSchema,
      input: {
        fields: "username",
      },
    });
  }
}
