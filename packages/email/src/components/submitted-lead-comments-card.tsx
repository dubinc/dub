import { OG_AVATAR_URL } from "@dub/utils";
import {
  Column,
  Img,
  Link,
  Markdown,
  Row,
  Section,
  Text,
} from "@react-email/components";

const MAX_DISPLAYED_COMMENTS = 3;

export type SubmittedLeadCommentEmailProps = {
  text: string;
  createdAt: Date;
  user: {
    name: string;
    image: string | null;
  };
};

export function SubmittedLeadCommentsCard({
  lead,
  comments,
  buttonText,
  buttonUrl,
}: {
  lead: {
    name: string;
    email: string;
    image: string | null;
  };
  comments: SubmittedLeadCommentEmailProps[];
  buttonText: string;
  buttonUrl: string;
}) {
  return (
    <Section className="rounded-xl border border-solid border-neutral-200">
      <Row className="px-4 py-4">
        <Column className="w-[36px] align-middle">
          <Img
            src={lead.image || `${OG_AVATAR_URL}${lead.email}`}
            width="32"
            height="32"
            alt={lead.name}
            className="rounded-full"
          />
        </Column>
        <Column className="pl-3 align-middle">
          <Text className="my-0 text-[15px] font-semibold text-neutral-800">
            {lead.name}
          </Text>
          <Text className="my-0 text-[13px] text-neutral-500">
            {lead.email}
          </Text>
        </Column>
      </Row>

      <Section className="rounded-b-xl border-0 border-t border-solid border-neutral-200 bg-neutral-50 px-3 pb-3">
        {comments.slice(0, MAX_DISPLAYED_COMMENTS).map((comment, idx) => (
          <Section
            key={idx}
            className="mt-3 rounded-lg border border-solid border-neutral-200 bg-white px-4"
          >
            <Text className="mb-0 mt-3 text-[12px] text-neutral-500">
              <Img
                src={
                  comment.user.image || `${OG_AVATAR_URL}${comment.user.name}`
                }
                width="16"
                height="16"
                alt={comment.user.name}
                className="mr-1.5 inline-block rounded-full align-middle"
              />
              <span className="align-middle font-semibold text-neutral-800">
                {comment.user.name}
              </span>
              <span className="align-middle">
                &nbsp;·&nbsp;
                {comment.createdAt.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                  timeZoneName: "short",
                })}
              </span>
            </Text>
            <Markdown
              markdownCustomStyles={{
                link: { color: "#262626", textDecoration: "underline" },
              }}
              markdownContainerStyles={{
                fontSize: 14,
                lineHeight: "20px",
                color: "#262626",
              }}
            >
              {comment.text}
            </Markdown>
          </Section>
        ))}
        {comments.length > MAX_DISPLAYED_COMMENTS && (
          <Text className="mb-0 mt-3 text-center text-[12px] text-neutral-500">
            {comments.length - MAX_DISPLAYED_COMMENTS} more{" "}
            {comments.length - MAX_DISPLAYED_COMMENTS === 1
              ? "comment"
              : "comments"}
          </Text>
        )}
        <Link
          className="mt-3 block rounded-lg bg-neutral-900 px-6 py-3 text-center text-[13px] font-medium text-white no-underline"
          href={buttonUrl}
        >
          {buttonText}
        </Link>
      </Section>
    </Section>
  );
}
