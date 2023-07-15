import { Hr, Tailwind, Text } from "@react-email/components";

export default function Footer({
  email,
  marketing,
}: {
  email: string;
  marketing?: boolean;
}) {
  return (
    <Tailwind>
      <Hr className="mx-0 my-6 w-full border border-gray-200" />
      {marketing ? (
        <Text className="text-[12px] leading-6 text-gray-500">
          This email was intended for{" "}
          <span className="text-black">{email}</span>. If you were not expecting
          this email, you can ignore this email. If you don't want to receive
          emails like this in the future, you can{" "}
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" className="text-gray-600">
            unsubscribe here
          </a>
          .
        </Text>
      ) : (
        <Text className="text-[12px] leading-6 text-gray-500">
          This email was intended for{" "}
          <span className="text-black">{email}</span>. If you were not expecting
          this email, you can ignore this email. If you are concerned about your
          account's safety, please reply to this email to get in touch with us.
        </Text>
      )}
    </Tailwind>
  );
}
