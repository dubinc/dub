import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer";

export default function CampaignEmail({
  campaign = {
    subject: "Test Subject",
    bodyJson: {
      type: "doc",
      content: [],
    },
  },
}: {
  campaign?: {
    subject: string;
    bodyJson: any;
  };
}) {
  const bodyHtml = renderToReactElement({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
    ],
    options: {
      nodeMapping: {
        heading: ({ node, children }) => {
          // Extract level value safely for server component
          const nodeAttrs = node.attrs || {};
          const level = nodeAttrs.level || 1;

          // Only support H1 and H2 as per toolbar
          if (level === 1) {
            return (
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "16px 0 8px 0",
                  color: "#374151",
                  lineHeight: "1.2",
                }}
              >
                {children}
              </h1>
            );
          } else if (level === 2) {
            return (
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  margin: "16px 0 8px 0",
                  color: "#374151",
                  lineHeight: "1.2",
                }}
              >
                {children}
              </h2>
            );
          }
          // Fallback for any other heading levels (render as paragraph)
          return (
            <p
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                margin: "16px 0 8px 0",
                color: "#374151",
                lineHeight: "1.5",
              }}
            >
              {children}
            </p>
          );
        },
        paragraph: ({ children }) => (
          <p
            style={{
              margin: "0 0 16px 0",
              lineHeight: "1.5",
              color: "#4B5563",
            }}
          >
            {children}
          </p>
        ),
        hardBreak: () => <br />,
        image: ({ node }) => {
          const nodeAttrs = node.attrs || {};
          return (
            <img
              src={nodeAttrs.src}
              alt={nodeAttrs.alt || ""}
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
                margin: "16px 0",
                borderRadius: "8px",
              }}
            />
          );
        },
        mention: ({ node }) => {
          const nodeAttrs = node.attrs || {};
          return (
            <span
              style={{
                padding: "2px 4px",
                backgroundColor: "#DBEAFE",
                color: "#1D4ED8",
                borderRadius: "4px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {`{{${nodeAttrs.id}}}`}
            </span>
          );
        },
      },
      markMapping: {
        bold: ({ children }) => (
          <strong style={{ fontWeight: "bold" }}>{children}</strong>
        ),
        italic: ({ children }) => (
          <em style={{ fontStyle: "italic" }}>{children}</em>
        ),
        link: ({ node, children }) => {
          const nodeAttrs = node.attrs || {};
          return (
            <a
              href={nodeAttrs.href}
              style={{
                color: "#3B82F6",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              {children}
            </a>
          );
        },
      },
      unhandledNode: ({ node }) => {
        console.warn(`Unhandled node: ${node.type.name}`);
        return null;
      },
      unhandledMark: ({ mark }) => {
        console.warn(`Unhandled mark: ${mark.type.name}`);
        return null;
      },
    },
    content: campaign.bodyJson,
  });

  return (
    <Html>
      <Head />
      <Preview>{campaign.subject}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-6">{bodyHtml}</Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
