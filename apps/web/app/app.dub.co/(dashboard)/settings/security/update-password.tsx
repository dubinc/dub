"use client";

import useUser from "@/lib/swr/use-user";
import { Form } from "@dub/ui";
import { useState } from "react";
import { toast } from "sonner";

// Allow the user to update their existing password
export const UpdatePassword = () => {
  const { user, loading } = useUser();
  const [sending, setSending] = useState(false);

  // Send an email to the user with instructions to set their password
  const sendPasswordSetRequest = async () => {
    try {
      setSending(true);

      const response = await fetch("/api/user/set-password", {
        method: "POST",
      });

      if (response.ok) {
        toast.success(
          `We've sent you an email to ${user?.email} with instructions to set your password`,
        );
        return;
      }

      const { error } = await response.json();
      throw new Error(error.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Form
      title="Password"
      description="Manage your account password."
      inputAttrs={{
        name: "name",
        // defaultValue:
        //   status === "loading" ? undefined : session?.user?.name || "",
        placeholder: "Steve Jobs",
        maxLength: 32,
      }}
      helpText="Password must be at least 8 characters long containing at least one number, one uppercase letter, and one lowercase letter."
      handleSubmit={(data) =>
        fetch("/api/user", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }).then(async (res) => {
          if (res.status === 200) {
            // update();
            toast.success("Successfully updated your name!");
          } else {
            const { error } = await res.json();
            toast.error(error.message);
          }
        })
      }
    />
  );
};
