import { Axiom } from "@axiomhq/js";

export const axiomClient = process.env.AXIOM_TOKEN
  ? new Axiom({
      token: process.env.AXIOM_TOKEN,
    })
  : null;
