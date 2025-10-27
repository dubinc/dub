import ky, { KyInstance } from "ky";

export const apiInstance: KyInstance = ky.create({
  prefixUrl: "/api",
  credentials: "include",
  timeout: 30000,
});

export const fetcher = <T>(url: string, opt?: KyInstance) =>
  apiInstance<T>(url, { method: "get", throwHttpErrors: false, ...opt }).then(
    (res) => res.json(),
  );
