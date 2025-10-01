"use client";

import UploadAvatar from "@/ui/account/upload-avatar";
import UserId from "@/ui/account/user-id";
import { Form } from "@dub/ui";
import { APP_NAME } from "@dub/utils";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { useSession } from "next-auth/react";
import { FC } from "react";
import { toast } from "sonner";

interface ISettingsPageClientProps {
  sessionId: string;
}

const SettingsPageClient: FC<Readonly<ISettingsPageClientProps>> = ({
  sessionId,
}) => {
  const { data: session, update, status } = useSession();

  return (
    <>
      <Form
        title="Your Name"
        description={`This will be your display name on ${APP_NAME}.`}
        inputAttrs={{
          name: "name",
          defaultValue:
            status === "loading" ? undefined : session?.user?.name || "",
          placeholder: "New User",
          maxLength: 32,
        }}
        helpText="Max 32 characters."
        handleSubmit={(data) =>
          fetch("/api/user", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              trackClientEvents({
                event: EAnalyticEvents.ACCOUNT_UPDATED,
                params: {
                  page_name: "profile",
                  content_group: "account",
                  email: session?.user?.email,
                  nameChanged: true,
                  emailChanged: false,
                  avatarChanged: false,
                  passwordChanged: false,
                  event_category: "Authorized",
                },
                sessionId,
              });

              update();
              toast.success("Successfully updated your name!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
          })
        }
      />
      {/* @USEFUL_FEATURE: change email */}
      {/*<Form*/}
      {/*  title="Your Email"*/}
      {/*  description={`This will be the email you use to log in to ${APP_NAME} and receive notifications. A confirmation is required for changes.`}*/}
      {/*  inputAttrs={{*/}
      {/*    name: "email",*/}
      {/*    type: "email",*/}
      {/*    defaultValue: session?.user?.email || undefined,*/}
      {/*    placeholder: "example@domain.com",*/}
      {/*  }}*/}
      {/*  // helpText={<UpdateSubscription />}*/}
      {/*  helpText={""}*/}
      {/*  handleSubmit={(data) =>*/}
      {/*    fetch("/api/user", {*/}
      {/*      method: "PATCH",*/}
      {/*      headers: {*/}
      {/*        "Content-Type": "application/json",*/}
      {/*      },*/}
      {/*      body: JSON.stringify(data),*/}
      {/*    }).then(async (res) => {*/}
      {/*      if (res.status === 200) {*/}
      {/*        toast.success(*/}
      {/*          `A confirmation email has been sent to ${data.email}.`,*/}
      {/*        );*/}
      {/*      } else {*/}
      {/*        const { error } = await res.json();*/}
      {/*        toast.error(error.message);*/}
      {/*      }*/}
      {/*    })*/}
      {/*  }*/}
      {/*/>*/}
      <UploadAvatar sessionId={sessionId} />
      <UserId />
      {/* @USEFUL_FEATURE: workspace settings */}
      {/*<UpdateDefaultWorkspace />*/}
      {/*<DeleteAccountSection />*/}
    </>
  );
};

export default SettingsPageClient;
