import Form from "#/ui/form";
import SettingsLayout from "@/components/layout/app/settings-layout";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function PersonalSettings() {
  const { data: session, update } = useSession();
  return (
    <SettingsLayout>
      <Form
        title="Your Name"
        description="This will be your display name on Dub."
        inputData={{
          name: "name",
          defaultValue: session?.user?.name || undefined,
          placeholder: "Steve Jobs",
          maxLength: 32,
        }}
        helpText="Max 32 characters."
        handleSubmit={(data) =>
          fetch("/api/user", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              update();
              toast.success("Successfully updated your name!");
            } else {
              const errorMessage = await res.text();
              toast.error(errorMessage || "Something went wrong");
            }
          })
        }
      />
      <Form
        title="Your Email"
        description="This will be the email you use to log in to Dub and receive notifications."
        inputData={{
          name: "email",
          defaultValue: session?.user?.email || undefined,
          placeholder: "panic@thedis.co",
        }}
        helpText="Must be a valid email address."
        handleSubmit={(data) =>
          fetch("/api/user", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              update();
              toast.success("Successfully updated your email!");
            } else {
              const errorMessage = await res.text();
              toast.error(errorMessage || "Something went wrong");
            }
          })
        }
      />
    </SettingsLayout>
  );
}
