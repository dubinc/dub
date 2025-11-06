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
  Text,
} from "@react-email/components";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Footer } from "../components/footer";

const pixelBasedPreset = {
  theme: {
    fontSize: {
      xs: ["12px", { lineHeight: "18px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
    },
    lineHeight: {
      6: "24px",
      relaxed: "24px",
    },
    spacing: {
      0: "0px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      5: "20px",
      6: "24px",
      8: "32px",
      10: "40px",
    },
    borderRadius: {
      none: "0px",
      sm: "2px",
      DEFAULT: "4px",
      md: "6px",
      lg: "8px",
      xl: "12px",
      full: "9999px",
    },
  },
} as const;

const tailwindConfig = {
  presets: [pixelBasedPreset],
} as const;

const markdownComponents: Components = {
  p({ children }) {
    return (
      <Text className="text-sm leading-6 text-neutral-600">{children}</Text>
    );
  },
  a({ children, href }) {
    return (
      <Link
        href={href || ""}
        target="_blank"
        className="font-semibold text-neutral-800 underline underline-offset-2"
      >
        {children}
      </Link>
    );
  },
  ul({ children }) {
    return (
      <ul
        style={{
          margin: "0 0 16px",
          paddingLeft: "20px",
          listStylePosition: "outside",
          listStyleType: "disc",
          color: "#525252",
          fontSize: "14px",
          lineHeight: "20px",
        }}
      >
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol
        style={{
          margin: "0 0 16px",
          paddingLeft: "20px",
          listStylePosition: "outside",
          listStyleType: "decimal",
          color: "#525252",
          fontSize: "14px",
          lineHeight: "20px",
        }}
      >
        {children}
      </ol>
    );
  },
  li({ children }) {
    return (
      <li
        style={{
          marginBottom: "8px",
        }}
      >
        {children}
      </li>
    );
  },
  strong({ children }) {
    return (
      <strong className="font-semibold text-neutral-800">{children}</strong>
    );
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  blockquote({ children }) {
    return (
      <blockquote
        style={{
          margin: "16px 0",
          padding: "0 0 0 16px",
          borderLeft: "4px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          color: "#525252",
          fontSize: "14px",
          lineHeight: "20px",
        }}
      >
        {children}
      </blockquote>
    );
  },
  code({ inline, className, children }) {
    if (inline) {
      return (
        <code
          style={{
            display: "inline-block",
            padding: "2px 4px",
            borderRadius: "4px",
            backgroundColor: "#f4f4f5",
            border: "1px solid #e4e4e7",
            fontFamily:
              "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: "12px",
            lineHeight: "18px",
            color: "#1f2937",
          }}
        >
          {children}
        </code>
      );
    }

    return (
      <pre
        style={{
          margin: "16px 0",
          overflowX: "auto",
          borderRadius: "8px",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          padding: "12px",
          fontSize: "12px",
          lineHeight: "20px",
          color: "#f9fafb",
        }}
      >
        <code className={className}>{children}</code>
      </pre>
    );
  },
  hr() {
    return <hr className="my-6 border-neutral-200" />;
  },
};

export default function ProgramInvite({
  email = "panic@thedis.co",
  name = "John Doe",
  program = {
    name: "Acme",
    slug: "acme",
    logo: DUB_WORDMARK,
  },
  rewards = [
    {
      icon: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
      label: "Earn up to 65% per sale for 1 year",
    },
    {
      icon: "https://assets.dub.co/email-assets/icons/gift.png",
      label: "New users get 20% off for 3 months",
    },
  ],
  bounties = [
    {
      icon: "https://assets.dub.co/email-assets/icons/heart.png",
      label: "Create a YouTube video about Acme",
    },
    {
      icon: "https://assets.dub.co/email-assets/icons/trophy.png",
      label: "Earn $100 after generating $1,000 in revenue",
    },
  ],
  subject,
  title,
  body,
}: {
  email: string;
  name: string | null;
  program: {
    name: string;
    slug: string;
    logo: string | null;
  };
  rewards: { icon: string; label: string }[] | null;
  bounties: { icon: string; label: string }[] | null;
  subject?: string;
  title?: string;
  body?: string;
}) {
  const emailTitle = title || "You've been invited";
  const emailSubject =
    subject || `${program.name} invited you to join Dub Partners`;

  return (
    <Html>
      <Head />
      <Preview>Sign up for {program.name}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mb-8 mt-6">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="bt-5 mx-0 mt-10 p-0 text-lg font-medium text-black">
              {emailTitle}
            </Heading>

            {body ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={markdownComponents}
              >
                {body}
              </ReactMarkdown>
            ) : (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  {name && !name.includes("@") && <>Hi {name}, </>}
                  {program.name} invited you to join their program on Dub
                  Partners.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  {program.name} uses{" "}
                  <Link
                    href="https://dub.co/partners"
                    target="_blank"
                    className="font-semibold text-neutral-800 underline underline-offset-2"
                  >
                    Dub Partners
                  </Link>{" "}
                  to power their partner program and wants to work with great
                  people like you!
                </Text>
              </>
            )}

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-xs font-semibold text-white no-underline"
                href={`https://partners.dub.co/${program.slug}/register?email=${encodeURIComponent(email)}&next=/programs/${program.slug}`}
              >
                Accept Invite
              </Link>
            </Section>

            {Boolean(rewards?.length || bounties?.length) && (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  If you accept the invite, you're immediately eligible for the
                  following:
                </Text>
                <Section className="rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
                  {rewards && Boolean(rewards.length) && (
                    <>
                      <Text className="my-0 text-base font-semibold text-black">
                        Rewards
                      </Text>
                      {rewards.map((reward) => (
                        <Row key={reward.label} className="mb-0 mt-2">
                          <Column className="align-center">
                            <Img src={reward.icon} height="16" alt="" />
                          </Column>
                          <Column className="w-full pl-2">
                            <Text className="my-0 text-sm font-medium text-neutral-600">
                              {reward.label}
                            </Text>
                          </Column>
                        </Row>
                      ))}
                    </>
                  )}
                  {bounties && Boolean(bounties.length) && (
                    <>
                      <Text
                        className={`mb-0 text-base font-semibold text-black ${rewards?.length ? "mt-5" : "mt-0"}`}
                      >
                        Bounties
                      </Text>
                      {bounties.map((bounty) => (
                        <Row key={bounty.label} className="mb-0 mt-2">
                          <Column className="align-center">
                            <Img src={bounty.icon} height="16" alt="" />
                          </Column>
                          <Column className="w-full pl-2">
                            <Text className="my-0 text-sm font-medium text-neutral-600">
                              {bounty.label}
                            </Text>
                          </Column>
                        </Row>
                      ))}
                    </>
                  )}
                </Section>
              </>
            )}

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
