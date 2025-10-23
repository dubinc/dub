import { DubApiError } from "../errors";

export const validateEmailDomain = ({
  slug,
  fromAddress,
}: {
  slug: string;
  fromAddress: string;
}) => {
  if (fromAddress) {
    const domain = fromAddress.split("@")[1];

    if (domain !== slug) {
      throw new DubApiError({
        code: "bad_request",
        message: "From address must end with the email domain.",
      });
    }
  }
};
