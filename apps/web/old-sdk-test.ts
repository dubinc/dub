import Dub from "dub";

const dub = new Dub({ baseURL: "/api/v1", token: "my-token" });

const testMethods = async () => {
  await dub.links.create({ url: "https://example.com" });

  await dub.qr.retrieve({});
};
