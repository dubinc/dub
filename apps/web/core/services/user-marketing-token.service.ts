interface IDecodedUserData {
  id: string;
  email: string;
  isPaidUser: boolean;
}

const isBrowser = typeof window !== "undefined";

export const decodeUserMarketingToken = (token: string): IDecodedUserData => {
  try {
    const decodedString = isBrowser
      ? atob(token)
      : Buffer.from(token, "base64").toString("utf-8");

    const resultParsed = JSON.parse(decodedString);

    return resultParsed;
  } catch {
    throw new Error("Invalid token");
  }
};

// encode user token
export const encodeUserMarketingToken = (
  userData: IDecodedUserData,
): string => {
  const jsonString = JSON.stringify(userData);

  return isBrowser
    ? btoa(jsonString)
    : Buffer.from(jsonString, "utf-8").toString("base64");
};
