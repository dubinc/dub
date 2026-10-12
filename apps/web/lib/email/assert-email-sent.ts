import { DubApiError } from "@/lib/api/errors";
import { sendEmail } from "@dub/email";

type SendEmailResult = Awaited<ReturnType<typeof sendEmail>>;

export function assertEmailSent(result: SendEmailResult) {
  const failed =
    !result ||
    ("error" in result && Boolean(result.error)) ||
    ("data" in result && !result.data);

  if (failed) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Failed to send DNS instructions email.",
    });
  }
}
