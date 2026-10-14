"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import { getAuthError } from "@/lib/better-auth/auth-errors";
import { AnimatedSizeContainer, Button } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import {
  ComponentType,
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AccountAlreadyExistsModal } from "../account-already-exists-modal";
import { AuthMethodsSeparator } from "../auth-methods-separator";
import { EmailSignIn } from "./email-sign-in";
import { GitHubButton } from "./github-button";
import { GoogleButton } from "./google-button";
import { SAMLSignIn } from "./saml-sign-in";

export const authMethods = [
  "google",
  "github",
  "email",
  "saml",
  "password",
] as const;

export type AuthMethod = (typeof authMethods)[number];

function getLastUsedAuthMethod(): AuthMethod | undefined {
  return authMethods.find((m) => m === authClient.getLastUsedLoginMethod());
}

export const LoginFormContext = createContext<{
  authMethod: AuthMethod | undefined;
  setAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  clickedMethod: AuthMethod | undefined;
  showPasswordField: boolean;
  showSSOOption: boolean;
  setShowPasswordField: Dispatch<SetStateAction<boolean>>;
  setClickedMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  setShowSSOOption: Dispatch<SetStateAction<boolean>>;
}>({
  authMethod: undefined,
  setAuthMethod: () => {},
  clickedMethod: undefined,
  showPasswordField: false,
  showSSOOption: false,
  setShowPasswordField: () => {},
  setClickedMethod: () => {},
  setShowSSOOption: () => {},
});

export default function LoginForm({
  methods = [...authMethods],
  next,
}: {
  methods?: AuthMethod[];
  next?: string;
}) {
  const searchParams = useSearchParams();
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showSSOOption, setShowSSOOption] = useState(false);
  const [clickedMethod, setClickedMethod] = useState<AuthMethod | undefined>(
    undefined,
  );

  const { current: lastUsedAuthMethod } = useRef<AuthMethod | undefined>(
    getLastUsedAuthMethod(),
  );

  const [authMethod, setAuthMethod] = useState<AuthMethod | undefined>(
    lastUsedAuthMethod ?? "email",
  );

  useEffect(() => {
    const message = getAuthError({
      error: searchParams?.get("error"),
      fallback: "An unexpected error occurred. Please try again later.",
    });

    if (message) {
      toast.error(message);
    }
  }, [searchParams]);

  // Reset the state when leaving the page
  useEffect(() => () => setClickedMethod(undefined), []);

  const authProviders: {
    method: AuthMethod;
    component: ComponentType;
    props?: Record<string, unknown>;
  }[] = [
    {
      method: "google",
      component: GoogleButton,
      props: { next },
    },
    {
      method: "github",
      component: GitHubButton,
      props: { next },
    },
    {
      method: "email",
      component: EmailSignIn,
      props: { next },
    },
    {
      method: "saml",
      component: SAMLSignIn,
    },
  ];

  const currentAuthProvider = authProviders.find(
    (provider) => provider.method === authMethod,
  );

  const AuthMethodComponent = currentAuthProvider?.component;

  const showEmailPasswordOnly = authMethod === "email" && showPasswordField;

  return (
    <LoginFormContext.Provider
      value={{
        authMethod,
        setAuthMethod,
        clickedMethod,
        showPasswordField,
        showSSOOption,
        setShowPasswordField,
        setClickedMethod,
        setShowSSOOption,
      }}
    >
      <div className="flex flex-col gap-3">
        <AccountAlreadyExistsModal />
        <AnimatedSizeContainer height>
          <div className="flex flex-col gap-3 p-1">
            {authMethod && (
              <div className="flex flex-col gap-3">
                {AuthMethodComponent && (
                  <AuthMethodComponent {...currentAuthProvider?.props} />
                )}

                {!showEmailPasswordOnly &&
                  authMethod === lastUsedAuthMethod && (
                    <div className="text-center text-xs">
                      <span className="text-neutral-500">
                        You signed in with{" "}
                        {lastUsedAuthMethod.charAt(0).toUpperCase() +
                          lastUsedAuthMethod.slice(1)}{" "}
                        last time
                      </span>
                    </div>
                  )}
                <AuthMethodsSeparator />
              </div>
            )}

            {showEmailPasswordOnly ? (
              <div className="mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowPasswordField(false)}
                  text="Continue with another method"
                />
              </div>
            ) : (
              authProviders
                .filter(
                  (provider) =>
                    provider.method !== authMethod &&
                    methods.includes(provider.method),
                )
                .map((provider) => (
                  <div key={provider.method}>
                    <provider.component {...provider.props} />
                  </div>
                ))
            )}
          </div>
        </AnimatedSizeContainer>
      </div>
    </LoginFormContext.Provider>
  );
}
