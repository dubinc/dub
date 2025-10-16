"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { CustomGoogleButton } from "./custom-google-button";

export const SignUpOAuth = ({
  sessionId,
  methods,
  onEmailSubmit,
  isLoading,
  isDisabled,
  error,
}: {
  sessionId: string;
  methods: ("email" | "google")[];
  onEmailSubmit: (
    email: string,
    signupMethod: "email" | "google",
  ) => Promise<void>;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string | null;
}) => {
  const handleEmailReceived = async (email: string) => {
    console.log("Received email from Google:", email);
    await onEmailSubmit(email, "google");
  };

  const handleGoogleError = (error: any) => {
    console.error("Google OAuth error:", error);
  };

  return (
    methods.includes("google") && (
      <div className="flex flex-col">
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        >
          <CustomGoogleButton
            sessionId={sessionId}
            onEmailReceived={handleEmailReceived}
            onError={handleGoogleError}
            loading={isLoading}
            disabled={isDisabled}
          />
        </GoogleOAuthProvider>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    )
  );
};
