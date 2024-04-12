import { DubApiError } from "./errors";

// TODO:
// Move this to a proper place
export const parseRequestBody = async (req: Request) => {
  try {
    return await req.json();
  } catch (e) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Invalid JSON format in request body. Please ensure the request body is a valid JSON object.",
    });
  }
};
