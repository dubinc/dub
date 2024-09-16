import { Dub } from "dub";

export const dub = new Dub({
  token: process.env.DUB_API_KEY,
  serverURL: "https://api-staging.dub.co",
});
