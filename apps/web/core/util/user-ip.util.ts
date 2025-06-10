export const getUserIp = (headerStore: Headers) => {
  const ip =
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for") ||
    "127.0.0.1";

  return ip?.split(",")?.at(0);
};
