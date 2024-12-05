"use client";

import { AnimatedSizeContainer, useLocalStorage } from "@dub/ui";
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
import { EmailSignIn } from "./email-sign-in";
import { GitHubButton } from "./github-button";
import { GoogleButton } from "./google-button";
import { SSOSignIn } from "./sso-sign-in";

export const authMethods = [
  "google",
  "github",
  "email",
  "saml",
  "password",
] as const;

export type AuthMethod = (typeof authMethods)[number];

export const errorCodes = {
  "no-credentials": "Please provide an email and password.",
  "invalid-credentials": "Email or password is incorrect.",
  "exceeded-login-attempts":
    "Account has been locked due to too many login attempts. Please contact support to unlock your account.",
  "too-many-login-attempts": "Too many login attempts. Please try again later.",
  "email-not-verified": "Please verify your email address.",
  Callback:
    "We encountered an issue processing your request. Please try again or contact support if the problem persists.",
  OAuthSignin:
    "There was an issue signing you in. Please ensure your provider settings are correct.",
  OAuthCallback:
    "We faced a problem while processing the response from the OAuth provider. Please try again.",
};

export const LoginFormContext = createContext<{
  authMethod: AuthMethod | undefined;
  setAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  clickedMethod: AuthMethod | undefined;
  showPasswordField: boolean;
  showSSOOption: boolean;
  setShowPasswordField: Dispatch<SetStateAction<boolean>>;
  setClickedMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  setLastUsedAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  setShowSSOOption: Dispatch<SetStateAction<boolean>>;
}>({
  authMethod: undefined,
  setAuthMethod: () => {},
  clickedMethod: undefined,
  showPasswordField: false,
  showSSOOption: false,
  setShowPasswordField: () => {},
  setClickedMethod: () => {},
  setLastUsedAuthMethod: () => {},
  setShowSSOOption: () => {},
});

export default function LoginForm({
  methods = [...authMethods],
  redirectTo,
}: {
  methods?: AuthMethod[];
  redirectTo?: string;
}) {
  const searchParams = useSearchParams();
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showSSOOption, setShowSSOOption] = useState(false);
  const [clickedMethod, setClickedMethod] = useState<AuthMethod | undefined>(
    undefined,
  );

  const [lastUsedAuthMethodLive, setLastUsedAuthMethod] = useLocalStorage<
    AuthMethod | undefined
  >("last-used-auth-method", undefined);
  const { current: lastUsedAuthMethod } = useRef<AuthMethod | undefined>(
    lastUsedAuthMethodLive,
  );

  const [authMethod, setAuthMethod] = useState<AuthMethod | undefined>(
    authMethods.find((m) => m === lastUsedAuthMethodLive) ?? "email",
  );

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      toast.error(
        errorCodes[error] ||
          "An unexpected error occurred. Please try again later.",
      );
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
    },
    {
      method: "github",
      component: GitHubButton,
    },
    {
      method: "email",
      component: EmailSignIn,
      props: { redirectTo },
    },
    {
      method: "saml",
      component: SSOSignIn,
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
        setLastUsedAuthMethod,
        setShowSSOOption,
      }}
    >
      <div className="flex flex-col gap-3">
        <AnimatedSizeContainer height>
          <div className="flex flex-col gap-3 p-1">
            {authMethod && (
              <div className="flex flex-col gap-2">
                {AuthMethodComponent && (
                  <AuthMethodComponent {...currentAuthProvider?.props} />
                )}

                {!showEmailPasswordOnly &&
                  authMethod === lastUsedAuthMethod && (
                    <div className="text-center text-xs">
                      <span className="text-gray-500">
                        You signed in with{" "}
                        {lastUsedAuthMethod.charAt(0).toUpperCase() +
                          lastUsedAuthMethod.slice(1)}{" "}
                        last time
                      </span>
                    </div>
                  )}
                <div className="my-2 flex flex-shrink items-center justify-center gap-2">
                  <div className="grow basis-0 border-b border-gray-300" />
                  <span className="text-xs font-normal uppercase leading-none text-gray-500">
                    or
                  </span>
                  <div className="grow basis-0 border-b border-gray-300" />
                </div>
              </div>
            )}

            {showEmailPasswordOnly ? (
              <div className="mt-2 text-center text-sm text-gray-500">
                <button
                  type="button"
                  onClick={() => setShowPasswordField(false)}
                  className="font-semibold text-gray-500 transition-colors hover:text-black"
                >
                  Continue with another method
                </button>
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
                    <provider.component />
                  </div>
                ))
            )}
          </div>
        </AnimatedSizeContainer>
      </div>
    </LoginFormContext.Provider>
  );
}
