import {
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  DUB_WORDMARK,
} from "@dub/utils";
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
import { Footer } from "../components/footer";

export default function ConnectPayoutReminder({
  email = "panic@thedis.co",
  programs = [
    {
      id: "1",
      name: "Acme",
      logo: "https://dubassets.com/logos/clrei1gld0002vs9mzn93p8ik_384uSfo",
      amount: 120_00,
    },
    {
      id: "2",
      name: "Dub",
      logo: "https://dubassets.com/programs/prog_d8pl69xXCv4AoHNT281pHQdo/logo_MJb5L8D",
      amount: 40_24,
    },
  ],
}: {
  email: string;
  programs: {
    id: string;
    name: string;
    logo?: string | null;
    amount: number;
  }[];
}) {
  return (
    <Html>
      <Head />
      <Preview>
        You have rewards ready to be paid out, but you need to connect your
        payout details to receive them.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Don't forget to connect your payout details
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You have pending rewards on Dub Partners, but you need to connect
              your payout details (bank account) to receive them.
            </Text>

            <Section className="mt-10 text-base">
              <Row className="mb-1 text-sm text-neutral-600">
                <Column>Program</Column>
                <Column className="text-right">Pending payouts</Column>
              </Row>
              {programs.map((program) => (
                <Row key={program.id} className="h-10">
                  <Column>
                    <Row>
                      <Column width="32">
                        <Img
                          src={
                            program.logo ||
                            `${DICEBEAR_AVATAR_URL}${program.name}`
                          }
                          width="20"
                          height="20"
                          alt="Program logo"
                          className="rounded-full border border-neutral-200"
                        />
                      </Column>
                      <Column className="text-sm font-semibold text-neutral-800">
                        {program.name}
                      </Column>
                    </Row>
                  </Column>
                  <Column className="text-right text-sm">
                    {currencyFormatter(program.amount / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Column>
                </Row>
              ))}
            </Section>

            <Section className="mt-8 text-center">
              <Link
                href="https://partners.dub.co/settings/payouts"
                className="box-border block w-full rounded-md bg-black px-0 py-4 text-center text-sm font-medium leading-none text-white no-underline"
              >
                Connect payout details
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
