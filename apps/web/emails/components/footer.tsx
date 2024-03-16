import { Hr, Tailwind, Text } from "@react-email/components";

export default function Footer({
  email,
  marketing,
}: {
  email: string;
  marketing?: boolean;
}) {
  if (marketing) {
    return null;
  }

  return (
    <Tailwind>
      <Hr
        style={{
          margin: "0",
          marginTop: "1.5rem",
          marginBottom: "1.5rem",
          width: "100%",
          borderColor: "#e5e7eb",
        }}
      />
      <Text style={{ fontSize: "12px", lineHeight: "1.5", color: "#6b7280" }}>
        This email was intended for{" "}
        <span style={{ color: "black" }}>{email}</span>. If you were not
        expecting this email, you can ignore this email. If you are concerned
        about your account's safety, please reply to this email to get in touch
        with us.
      </Text>
    </Tailwind>
  );
}
