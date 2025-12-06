import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
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
import { Footer } from "../components/footer";

export default function NewBountySubmission({
  workspace = {
    slug: "acme",
  },
  bounty = {
    id: "bnty_1K38JQ6DAGD1HHP30T4SX9HKG",
    name: "Promote Acme at your campus and earn $500 ",
  },
  partner = {
    name: "John Doe",
    image:
      "https://dubassets.com/partners/pn_H4TB2V5hDIjpqB7PwrxESoY3/image_wCBZlIJ",
    email: "john.doe@example.com",
  },
  submission = {
    id: "bnty_sub_1K38CT0YY8F5HYV5DXBX2137T",
  },
  email = "panic@thedis.co",
}: {
  workspace: {
    slug: string;
  };
  bounty: {
    id: string;
    name: string;
  };
  partner: {
    name: string;
    image: string | null;
    email: string;
  };
  submission: {
    id: string;
  };
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New bounty submission</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-medium text-black">
              New bounty submission
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              A bounty has been submitted for <strong>{bounty.name}</strong> and
              requires approval.
            </Text>

            <Section className="mb-8 mt-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50 p-5">
              <div className="flex h-10 items-center">
                <div className="relative w-fit">
                  <Img
                    src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                    width="32"
                    height="32"
                    alt={partner.id}
                    className="rounded-full border border-solid border-neutral-100"
                  />
                </div>
                <div className="ml-4 flex-1">
                  <Text className="m-0 p-0 text-sm font-semibold text-neutral-800">
                    {partner.name}
                  </Text>
                  <Text className="m-0 p-0 text-sm font-medium text-neutral-500">
                    {partner.email}
                  </Text>
                </div>
              </div>
            </Section>

            <Section className="mt-6 text-center">
              <Link
                href={`https://app.dub.co/${workspace.slug}/program/bounties/${bounty.id}?submissionId=${submission.id}`}
                className="box-border block w-full rounded-md bg-black px-2 py-4 text-center text-sm font-medium leading-none text-white no-underline"
              >
                Review bounty
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
