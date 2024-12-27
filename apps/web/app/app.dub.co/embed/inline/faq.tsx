import { BlockMarkdown } from "@/ui/partners/lander-blocks/BlockMarkdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@dub/ui";
import { TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { Program } from "@prisma/client";
import { motion } from "framer-motion";

export function EmbedFAQ({ program }: { program: Program }) {
  const items = [
    {
      title: `What is the ${program.name} Affiliate Program`,
      content: `The ${program.name} Affiliate Program is a way for you to earn money by referring new customers to ${program.name}. For each new customer you refer, you'll earn a ${program.commissionAmount}% commission on their subscription for up to ${program.recurringDuration} ${program.recurringInterval}s. There are no limits to how much you can earn.`,
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
      className="rounded-lg border border-neutral-100 bg-white px-8 py-4"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <Accordion type="multiple">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger className="py-2 text-neutral-700" variant="plus">
              <h3 className="text-base">{item.title}</h3>
            </AccordionTrigger>
            <AccordionContent>
              <BlockMarkdown className="py-2 text-neutral-500">
                {item.content}
              </BlockMarkdown>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
