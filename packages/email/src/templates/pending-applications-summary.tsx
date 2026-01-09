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
      country: "US",
    },
    {
      id: "pn_1JPBEGP7EXF76CXT1W99VERW6",
      name: "Derek Forbes",
      email: "d.forbes@gmail.com",
      image: `${OG_AVATAR_URL}pn_1JPBEGP7EXF76CXT1W99VERW6`,
      country: "GB",
    },
    {
      id: "pn_1JPBEGP7EXF76CXT1W99VERW7",
      name: "Marvin Ta",
      email: "marvin@email.com",
      image: `${OG_AVATAR_URL}pn_1JPBEGP7EXF76CXT1W99VERW7`,
      country: "AU",
    },
  ],
  totalCount = 12,
  date = new Date(),
}: {
  email: string;
  workspace: {
    slug: string;
  };
  partners: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    country: string | null;
  }[];
  totalCount: number;
  date: Date;
}) {
  const formattedDate = format(date, "MMM d, yyyy");
  const applicationsUrl = `https://app.dub.co/${workspace.slug}/program/partners/applications`;

  return (
    <Html>
      <Head />
      <Preview>
        You have {totalCount} new pending applications to review on Dub for{" "}
        {formattedDate}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-medium text-black">
              New partner applications
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              You have <strong>{totalCount}</strong> new pending applications to{" "}
              <Link
                href={applicationsUrl}
                className="text-gray-600 underline underline-offset-4"
              >
                review on Dub
              </Link>{" "}
              for {formattedDate}. Here are the most recent applications.
            </Text>

            <Section className="my-6">
              {partners.map((partner, index) => {
                return (
                  <Section
                    key={partner.id}
                    className={`rounded-xl border border-solid border-neutral-200 bg-neutral-50 p-4 ${index < partners.length - 1 ? "mb-4" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="relative shrink-0">
                          <Img
                            src={
                              partner.image || `${OG_AVATAR_URL}${partner.id}`
                            }
                            width="40"
                            height="40"
                            alt={partner.name}
                            className="rounded-full border border-solid border-neutral-100"
                          />
                          {partner.country && (
                            <div className="absolute -right-1 top-0 overflow-hidden rounded-full bg-white p-0.5">
                              <Img
                                src={`https://flag.vercel.app/m/${partner.country}.svg`}
                                width="12"
                                height="12"
                                alt={partner.country}
                                className="size-3 rounded-full"
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1" style={{ maxWidth: "calc(100% - 120px)" }}>
                          <Text className="m-0 p-0 text-sm font-semibold text-black" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                            {partner.name}
                          </Text>
                          <Text className="m-0 p-0 text-sm font-medium text-gray-500" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                            {partner.email}
                          </Text>
                        </div>
                      </div>
                      <Link
                        href={`${applicationsUrl}?partnerId=${partner.id}`}
                        className="box-border shrink-0 rounded-md border border-solid border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium leading-none text-black no-underline whitespace-nowrap"
                        style={{ flexShrink: 0 }}
                      >
                        Review
                      </Link>
                    </div>
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
