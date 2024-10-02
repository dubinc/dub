import type { APIError } from "@/types"
import type { Response as NodeFetchResponse } from "node-fetch"

type AnyResponse = Response | NodeFetchResponse

export async function parseApiResponse<T>(response: AnyResponse): Promise<T> {
  const contentType = response.headers.get("content-type")

  if (contentType?.includes("application/json")) {
    const parsedData = await response.json()

    if ("error" in parsedData) {
      throw new Error((parsedData as APIError).error.message)
    }
    return parsedData as T
  }
  const textData = await response.text()
  throw new Error(textData)
}
