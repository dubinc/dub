import { DUB_WORDMARK, pluralize } from "@dub/utils";
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

export default function ExportReady({
  email = "panic@thedis.co",
  downloadUrl = "https://dev.dubassets.com/exports/partners/xxxx.csv",
  exportType = "partners",
  expiresInDays = 7,
  program,
  workspace,
}: {
  email: string;
  downloadUrl: string;
  exportType: "partners" | "commissions" | "links" | "events";
  expiresInDays?: number;
  program?: {
    name: string;
  };
  workspace?: {
    name: string;
  };
}) {
  const contextName = program?.name || workspace?.name || "your workspace";
  return (
    <Html>
      <Head />
      <Preview>Your {exportType} export is ready to download</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Your {exportType} export is ready
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your {exportType} export from your <strong>{contextName}</strong>{" "}
              {program ? "program" : "workspace"} has been completed and is
              ready to download.
            </Text>
            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={downloadUrl}
              >
                Download Export
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-neutral-500">
              This download link will expire in {expiresInDays}{" "}
              {pluralize("day", expiresInDays)}.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
