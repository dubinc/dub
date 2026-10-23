import { DUB_WORDMARK } from "@dub/utils";
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
} from "@react-email/components";
import { Footer } from "../components/footer";
import {
  SubmittedLeadCommentEmailProps,
  SubmittedLeadCommentsCard,
} from "../components/submitted-lead-comments-card";

export default function NewSubmittedLeadCommentsFromPartner({
  workspace = {
    slug: "acme",
  },
  partner = {
    id: "pn_123",
    name: "Derek Forbes",
  },
  lead = {
    id: "sbl_123",
    name: "Jim Stephenson",
    email: "jim@nike.com",
    image: null,
  },
  comments = [
    {
      text: "Here's a link to their [contact info](https://dub.co).",
      createdAt: new Date(),
      user: { name: "Derek Forbes", image: null },
    },
  ],
  email = "panic@thedis.co",
}: {
  workspace: {
    slug: string;
  };
  partner: {
    id: string;
    name: string;
  };
  lead: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  comments: SubmittedLeadCommentEmailProps[];
  email: string;
}) {
  const leadUrl = `https://app.dub.co/${workspace.slug}/program/leads?leadId=${lead.id}`;
  const partnerUrl = `https://app.dub.co/${workspace.slug}/program/partners/${partner.id}`;
  const title = `${comments.length} submitted lead ${comments.length === 1 ? "comment" : "comments"} from ${partner.name}`;

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-8">
              <Heading className="my-0 text-lg font-semibold text-black">
                {title}
              </Heading>
              <Link
                className="text-[13px] font-medium text-neutral-500 underline"
                href={partnerUrl}
              >
                View profile in Dub
              </Link>
            </Section>

            <SubmittedLeadCommentsCard
              lead={lead}
              comments={comments}
              buttonText="View in Dub"
              buttonUrl={leadUrl}
            />

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
