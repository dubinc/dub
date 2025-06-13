import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * SecureHttpClient - Universal HTTP client using curl to bypass TLS fingerprinting
 *
 * Problem: Some APIs use TLS fingerprinting to detect and block Node.js requests.
 * Solution: Use system curl which has different TLS signature that these APIs accept.
 */
export class SecureHttpClient {
  private sanitizeHeaders(
    headers: Record<string, string | undefined>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private buildCurlCommand(
    url: string,
    method: string,
    headers: Record<string, string | undefined>,
    body?: any,
  ): string {
    const sanitizedHeaders = this.sanitizeHeaders(headers);
    const headerArgs = Object.entries(sanitizedHeaders)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(" ");

    let command = `curl -s -X ${method} ${headerArgs}`;

    if (body) {
      const jsonBody = JSON.stringify(body).replace(/"/g, '\\"');
      command += ` -d "${jsonBody}"`;
    }

    command += ` "${url}"`;
    return command;
  }

  private async executeRequest<T>(
    command: string,
    enableLogging: boolean = false,
  ): Promise<T> {
    try {
      if (enableLogging) {
        console.log("🔍 [SecureHttpClient] Executing curl command:", command);
      }

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        if (enableLogging) {
          console.log("🔍 [SecureHttpClient] Curl stderr:", stderr);
        }
        throw new Error(`Curl error: ${stderr}`);
      }

      if (enableLogging) {
        console.log("🔍 [SecureHttpClient] Curl stdout:", stdout);
      }

      const parsedData = JSON.parse(stdout);
      
      if (enableLogging) {
        console.log("🔍 [SecureHttpClient] Parsed response:", parsedData);
      }

      return parsedData;
    } catch (error: any) {
      if (enableLogging) {
        console.log("🔍 [SecureHttpClient] Execute request error:", {
          error: error.message,
          isJsonError: error.message?.includes("JSON"),
        });
      }

      if (error.message?.includes("JSON")) {
        throw new Error("Invalid JSON response from API");
      }
      throw error;
    }
  }

  async get<T>(
    url: string,
    headers: Record<string, string | undefined>,
    enableLogging: boolean = false,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "GET", headers);
    return this.executeRequest<T>(command, enableLogging);
  }

  async post<T>(
    url: string,
    headers: Record<string, string | undefined>,
    body: any,
    enableLogging: boolean = false,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "POST", headers, body);
    return this.executeRequest<T>(command, enableLogging);
  }

  async patch<T>(
    url: string,
    headers: Record<string, string | undefined>,
    body: any,
    enableLogging: boolean = false,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "PATCH", headers, body);
    return this.executeRequest<T>(command, enableLogging);
  }

  async put<T>(
    url: string,
    headers: Record<string, string | undefined>,
    body: any,
    enableLogging: boolean = false,
  ): Promise<T> {
    const command = this.buildCurlCommand(url, "PUT", headers, body);
    return this.executeRequest<T>(command, enableLogging);
  }
}

export const secureHttpClient = new SecureHttpClient(); 