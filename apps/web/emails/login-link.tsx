import { DUB_LOGO } from "@dub/utils";
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
  Text,
} from "@react-email/components";
import Footer from "./components/footer";

export default function LoginLink({
  email = "panic@thedis.co",
  url = "http://localhost:8888/api/auth/callback/email?callbackUrl=http%3A%2F%2Fapp.localhost%3A3000%2Flogin&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&email=youremail@gmail.com",
}: {
  email: string;
  url: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your Dub.co Login Link</Preview>
      <Body
        style={{
          margin: "auto",
          backgroundColor: "white",
          fontFamily: "sans-serif",
        }}
      >
        <Container
          style={{
            margin: "auto",
            marginTop: "2.5rem",
            maxWidth: "500px",
            borderRadius: "0.25rem",
            border: "1px solid #e5e7eb",
            padding: "1.25rem",
          }}
        >
          <Section style={{ marginTop: "2rem" }}>
            <Img
              src={DUB_LOGO}
              width="40"
              height="40"
              alt="Dub"
              style={{ margin: "auto" }}
            />
          </Section>
          <Heading
            style={{
              margin: "0",
              marginTop: "1.75rem",
              padding: "0",
              textAlign: "center",
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "black",
            }}
          >
            Your Login Link
          </Heading>
          <Text
            style={{ fontSize: "0.875rem", lineHeight: "1.5", color: "black" }}
          >
            Welcome to Dub.co!
          </Text>
          <Text
            style={{ fontSize: "0.875rem", lineHeight: "1.5", color: "black" }}
          >
            Please click the magic link below to sign in to your account.
          </Text>
          <Section
            style={{
              marginTop: "2rem",
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            <Link
              style={{
                borderRadius: "9999px",
                backgroundColor: "black",
                padding: "0.75rem 1.5rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "white",
                textDecoration: "none",
              }}
              href={url}
            >
              Sign in
            </Link>
          </Section>
          <Text
            style={{ fontSize: "0.875rem", lineHeight: "1.5", color: "black" }}
          >
            or copy and paste this URL into your browser:
          </Text>
          <Text
            style={{
              maxWidth: "320px",
              flexWrap: "wrap",
              wordBreak: "break-word",
              fontWeight: "500",
              color: "#7e22ce",
              textDecoration: "none",
            }}
          >
            {url.replace(/^https?:\/\//, "")}
          </Text>
          <Footer email={email} />
        </Container>
      </Body>
    </Html>
  );
}
