import { Folder } from "@/lib/folder/types";
import { DUB_WORDMARK } from "@dub/utils";
import { User } from "@prisma/client";
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
import Footer from "./components/footer";

export default function FolderEditAccessRequested({
  email = "panic@thedis.co",
  appName = "Dub.co",
  folderUrl = "http://localhost:8888/acme/settings/folders/cm1elre430005nf59czif340u/members",
  folder = {
    name: "Social Media",
  },
  requestor = {
    name: "Brendon Urie",
    email: "panic@thedis.co",
  },
}: {
  email: string;
  appName: string;
  folderUrl: string;
  folder: Pick<Folder, "name">;
  requestor: Pick<User, "name" | "email">;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Request to edit folder {folder.name} on {appName}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt={appName}
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Request to edit {folder.name}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              <strong>{requestor.name}</strong> (
              <Link
                className="text-blue-600 no-underline"
                href={`mailto:${requestor.email}`}
              >
                {requestor.email}
              </Link>
              ) is requesting edit access to the folder&nbsp;
              <strong>{folder.name}</strong>.
            </Text>
            <Section className="mb-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={folderUrl}
              >
                View folder
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              or copy and paste this URL into your browser:
            </Text>
            <Text className="max-w-sm flex-wrap break-words font-medium text-purple-600 no-underline">
              {folderUrl.replace(/^https?:\/\//, "")}
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
