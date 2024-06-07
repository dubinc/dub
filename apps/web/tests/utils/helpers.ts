export const randomId = () => Math.random().toString(36).substr(2, 9);

export const fetchOptions: RequestInit = {
  cache: "no-store",
  redirect: "manual",
  headers: {
    "dub-no-track": "true",
  },
};
