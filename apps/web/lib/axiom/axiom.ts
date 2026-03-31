import { Axiom } from "@axiomhq/js";

export const axiomClient = new Axiom({
  token: process.env.AXIOM_TOKEN!,
});
