import { DUB_WORDMARK } from "@dub/utils";
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
import { WorkspaceProps } from "../types";

export function DomainTransferred({
  email = "panic@thedis.co",
  domain = "dub.sh",
  newWorkspace = { name: "Dub", slug: "dub" },
  linksCount = 50,
}: {
  email: string;
  domain: string;
  newWorkspace: Pick<WorkspaceProps, "name" | "slug">;
  linksCount: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain Transferred</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Domain Transferred
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your domain <code className="text-purple-600">{domain}</code>{" "}
              {linksCount > 0 && (
                <>and its {linksCount > 0 ? linksCount : ""} links </>
              )}
              has been transferred to the workspace{" "}
              <Link
                href={`https://app.dub.co/${newWorkspace.slug}/settings/domains`}
                className="font-medium text-blue-600 no-underline"
              >
                {newWorkspace.name}↗
              </Link>
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default DomainTransferred;
