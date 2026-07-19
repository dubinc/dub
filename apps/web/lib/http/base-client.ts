import { logger } from "@/lib/axiom/server";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_LOGGED_BODY_LENGTH = 2_000;

type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequestOptions<
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType,
> {
  // request input — validated with inputSchema when provided, then sent as
  // query params for GET/DELETE requests or as the request body otherwise
  input?: z.input<TInput>;
  inputSchema?: TInput;
  outputSchema: TOutput;
  headers?: Record<string, string>;
  bodyType?: "json" | "form";
  timeout?: number;
  signal?: AbortSignal;
}

export class HttpClientError extends Error {
  readonly vendor: string;
  readonly method: string;
  readonly url: string;
  readonly status: number | null;
  readonly responseBody: string | null;

  constructor({
    vendor,
    method,
    url,
    status,
    responseBody,
    message,
  }: {
    vendor: string;
    method: string;
    url: string;
    status: number | null;
    responseBody: string | null;
    message: string;
  }) {
    super(message);
    this.name = "HttpClientError";
    this.vendor = vendor;
    this.method = method;
    this.url = url;
    this.status = status;
    this.responseBody = responseBody;
  }
}

// Base class for external vendor API clients.
export abstract class HttpBaseClient {
  protected abstract readonly vendor: string;
  protected abstract readonly baseUrl: string;

  // Header-based auth. Return {} for vendors that authenticate via query
  // params. Called per-request, so env validation belongs here
  protected abstract buildAuthHeaders():
    | Record<string, string>
    | Promise<Record<string, string>>;

  // Override for vendors that authenticate via query params. Any secret param
  // must also be listed in redactedQueryParams.
  protected buildAuthQuery(): Record<string, string> {
    return {};
  }

  // Query params whose values are replaced with "REDACTED" in every log
  // message and error. Request headers are never logged.
  protected readonly redactedQueryParams: string[] = [];

  // When false, response bodies are omitted from Axiom/console logs and
  // HttpClientError (for vendors that return PII).
  protected readonly logResponseBodies: boolean = true;

  // Override to translate HTTP failures into vendor-specific errors
  // (e.g. a DubApiError with a caller-facing message).
  protected mapError({
    method,
    url,
    status,
    responseBody,
  }: {
    method: string;
    url: string;
    status: number;
    responseBody: string | null;
    data: unknown;
  }): Error {
    return new HttpClientError({
      vendor: this.vendor,
      method,
      url,
      status,
      responseBody,
      message: `[${this.vendor}] ${method} ${url} failed with status ${status}`,
    });
  }

  private readonly debug: boolean;
  private readonly timeout: number;

  constructor({
    debug,
    timeout,
  }: {
    debug?: boolean;
    timeout?: number;
  } = {}) {
    this.debug = debug ?? process.env.NODE_ENV === "development";
    this.timeout = timeout ?? DEFAULT_TIMEOUT_MS;
  }

  async get<TInput extends z.ZodType, TOutput extends z.ZodType>(
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    return this.request("GET", path, options);
  }

  async post<TInput extends z.ZodType, TOutput extends z.ZodType>(
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    return this.request("POST", path, options);
  }

  async put<TInput extends z.ZodType, TOutput extends z.ZodType>(
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    return this.request("PUT", path, options);
  }

  async patch<TInput extends z.ZodType, TOutput extends z.ZodType>(
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    return this.request("PATCH", path, options);
  }

  async delete<TInput extends z.ZodType, TOutput extends z.ZodType>(
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    return this.request("DELETE", path, options);
  }

  private async request<TInput extends z.ZodType, TOutput extends z.ZodType>(
    method: string,
    path: string,
    options: HttpRequestOptions<TInput, TOutput>,
  ): Promise<z.output<TOutput>> {
    const url = new URL(`${this.baseUrl}${path}`);

    let input: unknown = options.input;

    if (options.inputSchema && options.input !== undefined) {
      const parsedInput = options.inputSchema.safeParse(options.input);

      if (!parsedInput.success) {
        const safeUrl = this.redactUrl(url);
        const message = `[${this.vendor}] ${method} ${safeUrl} request validation failed`;

        waitUntil(
          this.logError(message, {
            method,
            url: safeUrl,
            status: null,
            issues: z.prettifyError(parsedInput.error),
          }),
        );

        throw new HttpClientError({
          vendor: this.vendor,
          method,
          url: safeUrl,
          status: null,
          responseBody: null,
          message,
        });
      }

      input = parsedInput.data;
    }

    // GET/DELETE requests carry no body — their input becomes query params
    const inputAsQuery = method === "GET" || method === "DELETE";

    let query: Record<string, QueryValue | QueryValue[]> | undefined;

    if (inputAsQuery && input !== undefined) {
      query = input as Record<string, QueryValue | QueryValue[]>;
    }

    this.buildQueryParams(url, query);

    const safeUrl = this.redactUrl(url);

    let body: BodyInit | undefined;
    const headers: Record<string, string> = {};

    if (!inputAsQuery && input !== undefined) {
      if (options.bodyType === "form") {
        body = new URLSearchParams(input as Record<string, string>);
      } else {
        body = JSON.stringify(input);
        headers["Content-Type"] = "application/json";
      }
    }

    Object.assign(headers, await this.buildAuthHeaders(), options.headers);

    const signal =
      options.signal ?? AbortSignal.timeout(options.timeout ?? this.timeout);

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `[${this.vendor}] ${method} ${safeUrl} network error: ${reason}`;

      waitUntil(
        this.logError(message, {
          method,
          url: safeUrl,
          status: null,
          error: reason,
        }),
      );

      throw new HttpClientError({
        vendor: this.vendor,
        method,
        url: safeUrl,
        status: null,
        responseBody: null,
        message,
      });
    }

    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (this.debug) {
      console.log(
        `[${this.vendor}] ${method} ${safeUrl} -> ${response.status}`,
        data,
      );
    }

    if (!response.ok) {
      const responseBody = this.responseBodyForLog(text);

      waitUntil(
        this.logError(
          `[${this.vendor}] ${method} ${safeUrl} failed with status ${response.status}`,
          {
            method,
            url: safeUrl,
            status: response.status,
            responseBody,
          },
        ),
      );

      throw this.mapError({
        method,
        url: safeUrl,
        status: response.status,
        responseBody,
        data,
      });
    }

    const parsed = options.outputSchema.safeParse(data);

    if (!parsed.success) {
      const message = `[${this.vendor}] ${method} ${safeUrl} response validation failed`;
      const responseBody = this.responseBodyForLog(text);

      waitUntil(
        this.logError(message, {
          method,
          url: safeUrl,
          status: response.status,
          issues: z.prettifyError(parsed.error),
          responseBody,
        }),
      );

      throw new HttpClientError({
        vendor: this.vendor,
        method,
        url: safeUrl,
        status: response.status,
        responseBody,
        message,
      });
    }

    return parsed.data as z.output<TOutput>;
  }

  private buildQueryParams(
    url: URL,
    query: Record<string, QueryValue | QueryValue[]> = {},
  ) {
    const merged = {
      ...query,
      ...this.buildAuthQuery(),
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === null || item === undefined) {
            continue;
          }

          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }

  private redactUrl(url: URL): string {
    const safe = new URL(url);

    for (const param of this.redactedQueryParams) {
      if (safe.searchParams.has(param)) {
        safe.searchParams.set(param, "REDACTED");
      }
    }

    return safe.toString();
  }

  private responseBodyForLog(text: string): string | null {
    if (!this.logResponseBodies) {
      return null;
    }

    return this.truncate(text);
  }

  private truncate(text: string): string | null {
    if (!text) {
      return null;
    }

    return text.slice(0, MAX_LOGGED_BODY_LENGTH);
  }

  private async logError(message: string, metadata: Record<string, unknown>) {
    console.error(message, metadata);

    logger.error(message, {
      vendor: this.vendor,
      ...metadata,
    });

    await logger.flush();
  }
}
