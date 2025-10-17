import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function DiscountDeleted({
  email = "panic@thedis.co",
  coupon = {
    id: "jMT0WJUD",
  },
}: {
  email: string;
  coupon: {
    id: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Discount has been deleted</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Discount has been deleted
            </Heading>

            <Text className="text-sm leading-6 text-black">
              Your discount with Stripe coupon <strong>{coupon.id}</strong> has
              been deleted.
            </Text>

            <Text className="text-sm leading-6 text-black">
              This action also removes the discount association from any
              partners who were using this discount.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
