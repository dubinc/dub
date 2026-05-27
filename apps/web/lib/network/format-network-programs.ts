import { NetworkProgramProps } from "@/lib/types";
import { NetworkProgramSchema } from "@/lib/zod/schemas/program-network";
import { Prisma } from "@dub/prisma/client";
import * as z from "zod/v4";

type ProgramWithRelations = Prisma.ProgramGetPayload<{
  include: {
    groups: {
      include: {
        clickReward: true;
        leadReward: true;
        saleReward: true;
        referralReward: true;
        discount: true;
      };
    };
    categories: true;
    invoices: true;
  };
}>;

export function formatNetworkPrograms({
  programs,
  featured,
  sortBy = "popularity",
}: {
  programs: ProgramWithRelations[];
  featured?: boolean;
  sortBy?: "name" | "recency" | "popularity";
}): NetworkProgramProps[] {
  return z.array(NetworkProgramSchema).parse(
    programs
      .sort((a, b) =>
        featured
          ? (a.marketplaceRanking ?? 0) - (b.marketplaceRanking ?? 0)
          : sortBy === "popularity"
            ? (a.marketplaceRanking ?? 0) - (b.marketplaceRanking ?? 0) ||
              b.invoices.reduce((acc, invoice) => acc + invoice.amount, 0) -
                a.invoices.reduce((acc, invoice) => acc + invoice.amount, 0)
            : 0,
      )
      .map((program) => ({
        ...program,
        rewards:
          program.groups.length > 0
            ? [
                program.groups[0].clickReward,
                program.groups[0].leadReward,
                program.groups[0].saleReward,
              ].filter(Boolean)
            : [],
        discount: program.groups.length > 0 ? program.groups[0].discount : null,
        categories: program.categories.map(({ category }) => category),
      })),
  );
}
