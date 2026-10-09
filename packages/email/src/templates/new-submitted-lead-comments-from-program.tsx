import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
} from "@react-email/components";
import { Footer } from "../components/footer";
import {
  SubmittedLeadCommentEmailProps,
  SubmittedLeadCommentsCard,
} from "../components/submitted-lead-comments-card";

export default function NewSubmittedLeadCommentsFromProgram({
  program = {
    name: "Acme",
    slug: "acme",
    logo: "https://assets.dub.co/misc/acme-logo.png",
  },
  lead = {
    id: "sbl_123",
    name: "Jim Stephenson",
    email: "jim@nike.com",
    image: null,
  },
  comments = [
    {
      text: "Please?",
      createdAt: new Date(Date.now() - 1000 * 60 * 2),
      user: { name: "Steven Tey", image: null },
    },
    {
      text: "Can you please provide a PDF of their contact info?",
      createdAt: new Date(),
      user: { name: "Steven Tey", image: null },
    },
  ],
  email = "panic@thedis.co",
}: {
  program: {
    name: string;
    slug: string;
    logo: string | null;
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
  const leadUrl = `https://partners.dub.co/programs/${program.slug}/leads?leadId=${lead.id}`;
  const title = `${program.name} sent ${comments.length === 1 ? "a comment" : `${comments.length} comments`} for your submitted lead`;

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

            <Row className="my-8">
              <Column className="w-[40px] align-middle">
                <Img
                  src={program.logo || "https://assets.dub.co/wordmark.png"}
                  width="32"
                  height="32"
                  alt={program.name}
                  className="rounded-full"
                />
              </Column>
              <Column className="pl-2 align-middle">
                <Heading className="my-0 text-lg font-semibold text-black">
                  {title}
                </Heading>
                <Link
                  className="text-[13px] font-medium text-neutral-500 underline"
                  href={leadUrl}
                >
                  View submitted lead in Dub
                </Link>
              </Column>
            </Row>

            <SubmittedLeadCommentsCard
              lead={lead}
              comments={comments}
              buttonText="Reply in Dub"
              buttonUrl={leadUrl}
            />

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
