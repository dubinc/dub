import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { BountyThumbnailImage } from "../components/bounty-thumbnail";
import { Footer } from "../components/footer";

const ICONS = {
  calendar: "https://assets.dub.co/cms/icon-calendar-bounty.png",
  gift: "https://assets.dub.co/cms/icon-gift-bounty.png",
} as const;

type Icon = keyof typeof ICONS;

export default function NewBountyAvailable({
  bounty = {
    id: "bty_xxx",
    name: "Promote Acme at your campus and earn $500",
    type: "performance",
    endsAt: new Date(),
    rewardAmount: 10000,
    description:
      "How **does** it work?\n\nGet a group _together_ of at least 15 other people interested in trying out [Acme](https://dub.co). Then, during the event, take a photo of the group using Acme. When submitting, provide any links to the event or photos. Once confirmed, we'll create a one-time commission for you.",
  },
  program = {
    name: "Acme",
    slug: "acme",
  },
  email = "panic@thedis.co",
}: {
  bounty: {
    id: string;
    name: string;
    type: "performance" | "submission";
    endsAt: Date | null;
    rewardAmount: number | null;
    description: string | null;
  };
  program: {
    name: string;
    slug: string;
  };
  email: string;
}) {
  const formattedRewardAmount =
    bounty.rewardAmount != null
      ? currencyFormatter(bounty.rewardAmount, {
          trailingZeroDisplay: "stripIfInteger",
        })
      : null;

  const iconSizeClassByIcon: Record<Icon, string> = {
    calendar: "h-4.5 w-4.5",
    gift: "h-4.5 w-4.5",
  };

  return (
    <Html>
      <Head />
      <Preview>New bounty available for {program.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="bt-5 mx-0 mt-10 p-0 text-lg font-medium text-black">
              New bounty available for {program.name}
            </Heading>

            <Section className="rounded-xl border border-solid border-neutral-200 bg-white">
              <Section className="h-[140px] rounded-none rounded-t-xl bg-gray-50 py-1.5 text-center">
                <BountyThumbnailImage type={bounty.type} />
              </Section>

              <Section className="flex gap-1 p-6">
                <Text className="m-0 p-0 text-base font-semibold text-neutral-900">
                  {bounty.name}
                </Text>
                {(bounty.endsAt || formattedRewardAmount) && (
                  <Section className="pt-2">
                    {bounty.endsAt && (
                      <Row>
                        <Column className="w-5 align-middle">
                          <Img
                            src={ICONS.calendar}
                            className={iconSizeClassByIcon.calendar}
                            alt=""
                          />
                        </Column>
                        <Column className="pl-2">
                          <Text className="m-0 text-base font-normal text-neutral-500">
                            Ends {formatDate(bounty.endsAt)}
                          </Text>
                        </Column>
                      </Row>
                    )}
                    {formattedRewardAmount && (
                      <Row className={bounty.endsAt ? "mt-1" : ""}>
                        <Column className="w-5 align-middle">
                          <Img
                            src={ICONS.gift}
                            className={iconSizeClassByIcon.gift}
                            alt=""
                          />
                        </Column>
                        <Column className="pl-2">
                          <Text className="m-0 text-base font-normal text-neutral-500">
                            Earn {formattedRewardAmount}
                          </Text>
                        </Column>
                      </Row>
                    )}
                  </Section>
                )}
              </Section>

              {bounty.description && (
                <Section className="border-t border-solid border-neutral-200 p-6">
                  <Text className="m-0 p-0 text-sm font-semibold text-neutral-900">
                    Details
                  </Text>
                  <Section className="p-0 text-sm font-medium text-neutral-500">
                    <Markdown
                      markdownCustomStyles={{ link: { color: "black" } }}
                    >
                      {bounty.description}
                    </Markdown>
                  </Section>
                </Section>
              )}

              <Section className="px-6 pb-6 text-center">
                <Link
                  href={`https://partners.dub.co/programs/${program.slug}/bounties/${bounty.id}`}
                  className="box-border block w-full rounded-md bg-black px-2 py-4 text-center text-sm font-medium leading-none text-white no-underline"
                >
                  View bounty
                </Link>
              </Section>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
