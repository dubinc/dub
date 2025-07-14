const PAGE_LIMIT = 100;

export class PartnerStackApi {
  private readonly baseUrl = "https://api.partnerstack.com/api/v2";
  private readonly token: string;

  constructor({ token }: { token: string }) {
    this.token = token;
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();

      console.error("PartnerStack API Error:", error);

      throw new Error(error.message || "Unknown error from PartnerStack API.");
    }

    return await response.json();
  }

  async testConnection() {
    try {
      await this.fetch("/customers?limit=1");
      return true;
    } catch (error) {
      throw new Error("Invalid PartnerStack API token.");
    }
  }
}
