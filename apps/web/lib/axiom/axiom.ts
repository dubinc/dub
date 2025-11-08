import { Axiom } from "@axiomhq/js";

export const axiomClient = new Axiom({
  token: process.env.NEXT_PUBLIC_AXIOM_TOKEN!,
});
