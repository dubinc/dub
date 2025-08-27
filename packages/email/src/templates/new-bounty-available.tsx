import { DUB_WORDMARK, formatDate } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { BountyThumbnailImage } from "../components/bounty-thumbnail";
import { Footer } from "../components/footer";

export default function NewBountyAvailable({
  bounty = {
    name: "Promote Acme at your campus and earn $500",
    type: "performance",
    endsAt: new Date(),
    description:
      "How does it work? get a group together of at least 15 other people interested in trying out Acme. Then, during the event, take a photo of the group using Acme. When submitting, provide any links to the event or photos. Once confirmed, we'll create a one-time commission for you.",
  },
  program = {
    name: "Acme",
    slug: "acme",
  },
  email = "panic@thedis.co",
}: {
  bounty: {
    name: string;
    type: "performance" | "submission";
    endsAt: Date | null;
    description: string | null;
  };
  program: {
    name: string;
    slug: string;
  };
  email: string;
}) {
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
                {bounty.endsAt && (
                  <Text className="m-0 p-0 text-sm font-medium text-neutral-500">
                    Ends {formatDate(bounty.endsAt)}
                  </Text>
                )}
              </Section>

              {bounty.description && (
                <Section className="flex border-t border-solid border-neutral-200 p-6">
                  <Text className="m-0 p-0 text-sm font-semibold text-neutral-900">
                    Details
                  </Text>
                  <Text className="m-0 mt-2 p-0 text-sm font-medium text-neutral-500">
                    {bounty.description}
                  </Text>
                </Section>
              )}

              <Section className="px-6 pb-6 text-center">
                <Link
                  href={`https://partners.dub.co/programs/${program.slug}/bounties`}
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
