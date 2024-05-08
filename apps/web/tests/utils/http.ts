type Request = {
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  retries?: number;
};

type HttpClientConfig = {
  headers?: Record<string, string>;
  baseUrl: string;
};

type Response<TResponse> = {
  data: TResponse;
  status: number;
};

export class HttpClient {
  public readonly baseUrl: string;
  public readonly headers: Record<string, string>;

  public constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = config.headers ?? {};
  }

  private async request<TResponse>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    req: Request,
  ): Promise<Response<TResponse>> {
    const headers = {
      "Content-Type": "application/json",
      ...this.headers,
      ...req.headers,
    };

    const params = new URLSearchParams(req.query).toString();
    const url = `${this.baseUrl}${req.path}${params ? `?${params}` : ""}`;

    const response = await fetch(url, {
      method,
      headers,
      keepalive: true,
      body: JSON.stringify(req.body),
    });

    const { status } = response;
    const data = (await response.json()) as TResponse;

    return { data, status };
  }

  public async get<TResponse>(req: Request) {
    return await this.request<TResponse>("GET", req);
  }

  public async post<TResponse>(req: Request) {
    return await this.request<TResponse>("POST", req);
  }

  public async patch<TResponse>(req: Request) {
    return await this.request<TResponse>("PATCH", req);
  }

  public async put<TResponse>(req: Request) {
    return await this.request<TResponse>("PUT", req);
  }

  public async delete<TResponse>(req: Request) {
    return await this.request<TResponse>("DELETE", req);
  }
}
