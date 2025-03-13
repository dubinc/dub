import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import { BlockMarkdown } from "@/ui/partners/lander-blocks/BlockMarkdown";
import { Program } from "@dub/prisma/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@dub/ui";
import { TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";

export function ReferralsEmbedFAQ({
  program,
  reward,
}: {
  program: Program;
  reward: RewardProps | null;
}) {
  const rewardDescription = reward
    ? `For each new customer you refer, you'll earn a ${constructRewardAmount({
        amount: reward.amount,
        type: reward.type,
      })} commission on their subscription${
        reward.maxDuration === null
          ? " for their lifetime"
          : reward.maxDuration && reward.maxDuration > 1
            ? ` for up to ${reward.maxDuration} months`
            : ""
      }. There are no limits to how much you can earn.`
    : "";

  const items = [
    {
      title: `What is the ${program.name} Affiliate Program?`,
      content: `The ${program.name} Affiliate Program is a way for you to earn money by referring new customers to ${program.name}. ${rewardDescription}`,
    },

    {
      title: "What counts as a successful conversion?",
      content: `New customers that sign up for a paid plan within ${program.cookieLength} days of using your referral link will be counted as a successful conversion. Attributions are done on a last-click basis, so your link must be the last link clicked before the customer signs up for an account on ${program.name}.`,
    },
    {
      title: "How should I promote the program?",
      content:
        "You should promote the program by sharing your unique referral link with your audience. When you post or distribute content about Dub, your message must make it obvious that you have a financially compensated relationship with Dub. We need all promotions to be FTC compliant. A helpful guide can be found [here](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers).",
    },
    {
      title: "Can I refer myself?",
      content:
        "Self-referrals are not allowed. The goal of the program is to reward you for referring other people. This is not a way for you to get a discount on your own account.",
    },
  ];
  return (
    <motion.div
      className="border-border-muted bg-bg-default rounded-lg border px-4 py-2 sm:px-8 sm:py-4"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <Accordion type="multiple">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger
              className="text-content-default py-2"
              variant="plus"
            >
              <h3 className="text-left text-sm sm:text-base">{item.title}</h3>
            </AccordionTrigger>
            <AccordionContent>
              <BlockMarkdown className="text-content-subtle py-2 text-left text-sm sm:text-base">
                {item.content}
              </BlockMarkdown>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
