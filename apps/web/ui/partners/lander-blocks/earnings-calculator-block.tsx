import { RewardProps } from "@/lib/types";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { z } from "zod";
import { BlockTitle } from "./BlockTitle";

export function EarningsCalculatorBlock({
  block,
  reward,
}: {
  block: z.infer<typeof programLanderEarningsCalculatorBlockSchema>;
  reward?: RewardProps;
}) {
  return reward ? (
    <div>
      <BlockTitle title={block.data.title} />
      <div className="mt-5">
        earnings calculator here {block.data.productPrice}
      </div>
    </div>
  ) : null;
}
