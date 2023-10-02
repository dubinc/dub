import Button from "#/ui/button";
import Form from "#/ui/form";
import UploadAvatar from "@/components/app/account/upload-avatar";
import { useDeleteAccountModal } from "@/components/app/modals/delete-account-modal";
import SettingsLayout from "@/components/layout/app/settings-layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { toast } from "sonner";

export default function PersonalSettings() {
  const { data: session, update } = useSession();

  const { setShowDeleteAccountModal, DeleteAccountModal } =
    useDeleteAccountModal();

  const router = useRouter();

  useEffect(() => {
    if (router.query.google === "true") {
      toast.success(
        "Successfully connected your Google account! You can log in with Google from now on.",
      );
    }
  }, [router.query.google]);

  return (
    <SettingsLayout>
      <Form
        title="Your Name"
        description="This will be your display name on Dub."
        inputData={{
          name: "name",
          defaultValue: session?.user?.name || "",
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

      <UploadAvatar />

      <div className="rounded-lg border border-red-600 bg-white">
        <DeleteAccountModal />
        <div className="flex flex-col space-y-3 p-5 sm:p-10">
          <h2 className="text-xl font-medium">Delete Account</h2>
          <p className="text-sm text-gray-500">
            Permanently delete your Dub account and all of your Dub.sh links +
            their stats. This action cannot be undone - please proceed with
            caution.
          </p>
        </div>
        <div className="border-b border-red-600" />

        <div className="flex items-center justify-end p-3 sm:px-10">
          <div>
            <Button
              text="Delete Account"
              variant="danger"
              onClick={() => setShowDeleteAccountModal(true)}
            />
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
