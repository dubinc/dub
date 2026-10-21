import { assertEnv } from "@/lib/assert-env";
import { HttpBaseClient, HttpClientError } from "@/lib/http/base-client";
import * as z from "zod/v4";
import {
  getContentInputSchema,
  getProfileInputSchema,
  socialContentSchema,
  socialProfileSchema,
} from "./schema";

type GetProfileInput = z.input<typeof getProfileInputSchema>;
type GetContentInput = z.input<typeof getContentInputSchema>;

export class ScrapeCreatorsApiError extends HttpClientError {
  readonly data: unknown;

  constructor({
    data,
    ...args
  }: ConstructorParameters<typeof HttpClientError>[0] & { data: unknown }) {
    super(args);
    this.name = "ScrapeCreatorsApiError";
    this.data = data;
  }
}

class ScrapeCreatorsClient extends HttpBaseClient {
  protected readonly vendor = "ScrapeCreators";
  protected readonly baseUrl = "https://api.scrapecreators.com";

  constructor() {
    super({ timeout: 15_000, retry: { attempts: 3, delay: 3_000 } });
  }

  protected buildAuthHeaders() {
    return {
      "x-api-key": assertEnv("SCRAPECREATORS_API_KEY"),
    };
  }

  protected mapError({
    method,
    url,
    status,
    responseBody,
    data,
  }: {
    method: string;
    url: string;
    status: number;
    responseBody: string | null;
    data: unknown;
  }) {
    return new ScrapeCreatorsApiError({
      vendor: this.vendor,
      method,
      url,
      status,
      responseBody,
      data,
      message: `[${this.vendor}] ${method} ${url} failed with status ${status}`,
    });
  }

  // GET /v1/youtube/channel
  async getYouTubeChannel(input: GetProfileInput) {
    return await this.getProfile("/v1/youtube/channel", input);
  }

  // GET /v1/instagram/profile
  async getInstagramProfile(input: GetProfileInput) {
    return await this.getProfile("/v1/instagram/profile", input);
  }

  // GET /v1/tiktok/profile
  async getTikTokProfile(input: GetProfileInput) {
    return await this.getProfile("/v1/tiktok/profile", input);
  }

  // GET /v1/twitter/profile
  async getTwitterProfile(input: GetProfileInput) {
    return await this.getProfile("/v1/twitter/profile", input);
  }

  // GET /v1/youtube/video
  async getYouTubeVideo(input: GetContentInput) {
    return await this.getContent("/v1/youtube/video", input);
  }

  // GET /v1/instagram/post
  async getInstagramPost(input: GetContentInput) {
    return await this.getContent("/v1/instagram/post", input);
  }

  // GET /v1/twitter/tweet
  async getTwitterTweet(input: GetContentInput) {
    return await this.getContent("/v1/twitter/tweet", input);
  }

  // GET /v2/tiktok/video
  async getTikTokVideo(input: GetContentInput) {
    return await this.getContent("/v2/tiktok/video", input);
  }

  // GET /v1/linkedin/post
  async getLinkedInPost(input: GetContentInput) {
    return await this.getContent("/v1/linkedin/post", input);
  }

  private async getProfile(path: string, input: GetProfileInput) {
    return await this.get(path, {
      input,
      inputSchema: getProfileInputSchema,
      outputSchema: socialProfileSchema,
    });
  }

  private async getContent(path: string, input: GetContentInput) {
    return await this.get(path, {
      input,
      inputSchema: getContentInputSchema,
      outputSchema: socialContentSchema,
    });
  }
}

export const scrapeCreatorsClient = new ScrapeCreatorsClient();
