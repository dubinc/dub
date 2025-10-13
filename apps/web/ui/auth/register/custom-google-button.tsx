"use client";

import { Button, Google } from "@dub/ui";
import { useGoogleLogin } from "@react-oauth/google";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { useState } from "react";

interface CustomGoogleButtonProps {
  sessionId: string;
  onEmailReceived: (email: string) => void;
  onError?: (error: any) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const CustomGoogleButton = ({
  sessionId,
  onEmailReceived,
  onError,
  loading = false,
  disabled = false,
}: CustomGoogleButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);

        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }

        const userInfo = await response.json();
        const email = userInfo.email;

        if (!email) {
          throw new Error("No email found in Google account");
        }

        // Трекинг успешной авторизации
        trackClientEvents({
          event: EAnalyticEvents.AUTH_SUCCESS,
          params: {
            page_name: "landing",
            auth_type: "signup",
            auth_method: "google_custom",
            event_category: "nonAuthorized",
          },
          sessionId,
        });

        onEmailReceived(email);
      } catch (error) {
        console.error("Error getting user info:", error);

        // Трекинг ошибки
        trackClientEvents({
          event: EAnalyticEvents.AUTH_ERROR,
          params: {
            page_name: "landing",
            auth_type: "signup",
            auth_method: "google_custom",
            event_category: "nonAuthorized",
            error_code: "google-userinfo-failed",
            error_message:
              error instanceof Error ? error.message : "Unknown error",
          },
          sessionId,
        });

        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google login error:", error);

      // Трекинг ошибки авторизации
      trackClientEvents({
        event: EAnalyticEvents.AUTH_ERROR,
        params: {
          page_name: "landing",
          auth_type: "signup",
          auth_method: "google_custom",
          event_category: "nonAuthorized",
          error_code: "google-login-failed",
          error_message: "Google login failed",
        },
        sessionId,
      });

      if (onError) {
        onError(error);
      }
    },
    scope: "email profile", // Запрашиваем только email и базовую информацию профиля
  });

  const handleClick = async () => {
    // Трекинг клика по кнопке
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_CLICKED,
      params: {
        page_name: "landing",
        element_name: "signup",
        content_value: "google_custom",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    trackClientEvents({
      event: EAnalyticEvents.AUTH_ATTEMPT,
      params: {
        page_name: "landing",
        auth_type: "signup",
        auth_method: "google_custom",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    login();
  };

  return (
    <Button
      variant="secondary"
      text="Continue with Google"
      onClick={handleClick}
      loading={loading || isLoading}
      disabled={disabled || loading || isLoading}
      icon={<Google className="h-4 w-4" />}
      className="border-border-500"
    />
  );
};
