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
import { Footer } from "../components/footer";

export function PartnerSuspiciousActivities({
  email = "panic@thedis.co",
  startDate = new Date("2024-11-01"),
  endDate = new Date("2024-11-30"),
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  activities = [
    {
      partner: {
        id: "partner_123",
        name: "John Doe",
        image:
          "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
      },
      link: "https://dub.co/example",
      reason: "Running Google Ads",
    },
  ],
}: {
  email: string;
  startDate: Date;
  endDate: Date;
  program: {
    id: string;
    name: string;
    logo: string;
  };
  activities: {
    partner: {
      id: string;
      name: string;
      image: string;
    };
    link: string;
    reason: string;
  }[];
}) {
  return (
    <Html>
      <Head />
      <Preview>Weekly Partner Suspicious Activities Report</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-6 p-0 text-xl font-semibold text-black">
              Weekly Partner Suspicious Activities Report
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              {formatDate(startDate)} - {formatDate(endDate)}
            </Text>

            <Text className="mt-4 text-sm leading-6 text-black">
              Here's a summary of suspicious activities detected in your partner
              program this week:
            </Text>

            <div className="mt-4 flex flex-col gap-2">
              {activities.map((activity, index) => (
                <Section
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border border-solid border-neutral-200 p-3"
                >
                  <div className="flex items-center">
                    <Img
                      src={activity.partner.image}
                      width="32"
                      height="32"
                      alt={activity.partner.name}
                      className="rounded-full"
                    />
                    <Link
                      href={`/partners/${activity.partner.id}`}
                      className="ml-3 text-sm font-medium text-black no-underline"
                    >
                      {activity.partner.name}
                    </Link>
                  </div>

                  <div className="mt-2">
                    <Text className="m-0 text-sm text-gray-600 underline">
                      {activity.link}
                    </Text>

                    <Text className="m-0 text-sm text-gray-600">
                      {activity.reason}
                    </Text>
                  </div>
                </Section>
              ))}
            </div>

            <Footer email={email} marketing={false} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerSuspiciousActivities;
