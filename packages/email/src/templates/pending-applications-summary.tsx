import { DUB_WORDMARK, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { nFormatter } from "@dub/utils/src";
import {
  Body,
  Column,
  Container,
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
import { format } from "date-fns";
import { Footer } from "../components/footer";

export default function PendingApplicationsSummary({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  partners = [
    {
      id: "pn_1JPBEGP7EXF76CXT1W99VERW5",
      name: "Sarah Charpentier",
      email: "sarah@floridaman.org",
      image: `${OG_AVATAR_URL}pn_1JPBEGP7EXF76CXT1W99VERW5`,
    },
    {
      id: "pn_1JPBEGP7EXF76CXT1W99VERW6",
      name: "Derek Forbes",
      email: "d.forbes@gmail.com",
      image: `${OG_AVATAR_URL}pn_1JPBEGP7EXF76CXT1W99VERW6`,
    },
    {
      id: "pn_1JPBEGP7EXF76CXT1W99VERW7",
      name: "Marvin Ta",
      email: "marvin@email.com",
      image: `${OG_AVATAR_URL}pn_1JPBEGP7EXF76CXT1W99VERW7`,
    },
  ],
  totalCount = 1234,
  date = new Date(),
}: {
  email: string;
  workspace: {
    slug: string;
  };
  partners: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  }[];
  totalCount: number;
  date: Date;
}) {
  const formattedDate = format(date, "MMM d, yyyy");
  const applicationsUrl = `https://app.dub.co/${workspace.slug}/program/partners/applications`;

  return (
    <Html>
      <Preview>
        You have {nFormatter(totalCount, { full: true })} pending applications
        to review on Dub for {formattedDate}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-medium text-black">
              {nFormatter(totalCount, { full: true })}{" "}
              {pluralize("partner application", totalCount)} pending review
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              You have <strong>{nFormatter(totalCount, { full: true })}</strong>{" "}
              pending {pluralize("application", totalCount)} to{" "}
              <Link
                href={applicationsUrl}
                className="text-gray-600 underline underline-offset-4"
              >
                review on Dub
              </Link>
              . Reviewing these on time will keep your program running smoothly
              and provide a better partner experience.
            </Text>

            <Section className="my-6">
              {partners.map((partner, index) => {
                return (
                  <Section
                    key={partner.id}
                    className={`rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-4 ${index < partners.length - 1 ? "mb-3" : ""}`}
                  >
                    <Row>
                      <Column
                        width={52}
                        valign="middle"
                        style={{ paddingRight: "12px" }}
                      >
                        <Img
                          src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                          width="40"
                          height="40"
                          alt={partner.name || "partner avatar"}
                          className="rounded-full"
                        />
                      </Column>
                      <Column valign="middle" style={{ paddingRight: "12px" }}>
                        <div
                          style={{
                            width: "200px",
                            overflow: "hidden",
                          }}
                        >
                          <Text className="m-0 truncate p-0 text-sm font-semibold text-neutral-900">
                            {partner.name || ""}
                          </Text>
                          <Text className="m-0 truncate p-0 text-sm font-medium text-neutral-500 no-underline">
                            {partner.email}
                          </Text>
                        </div>
                      </Column>
                      <Column width={90} align="right" valign="middle">
                        <Link
                          href={`${applicationsUrl}?partnerId=${partner.id}`}
                          className="box-border inline-block rounded-md border border-solid border-neutral-200 bg-white px-4 py-2 text-center text-sm font-medium leading-none text-black no-underline"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Review
                        </Link>
                      </Column>
                    </Row>
                  </Section>
                );
              })}
            </Section>

            <Section className="mt-6 text-center">
              <Link
                href={applicationsUrl}
                className="box-border block w-full rounded-md bg-black px-2 py-3 text-center text-sm font-medium leading-none text-white no-underline"
              >
                View all applications
              </Link>
            </Section>

            <Footer
              email={email}
              notificationSettingsUrl={`https://app.dub.co/${workspace.slug}/settings/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
