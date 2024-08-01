"use client";

import { emailSchema } from "@/lib/zod/schemas/auth";
import {
  AnimatedSizeContainer,
  Button,
  Github,
  Google,
  InfoTooltip,
  Input,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { InputPassword, LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export const authMethods = [
  "google",
  "github",
  "email",
  "saml",
  "password",
] as const;
export type AuthMethod = (typeof authMethods)[number];

const errorCodes = {
  "no-credentials": "Please provide an email and password.",
  "invalid-credentials": "Email or password is incorrect.",
  "exceeded-login-attempts":
    "Account has been locked due to too many login attempts. Please contact support to unlock your account.",
  "too-many-login-attempts": "Too many login attempts. Please try again later.",
};

const LoginFormContext = createContext<{
  authMethod: AuthMethod | undefined;
  setAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  clickedMethod: AuthMethod | undefined;
  showPasswordField: boolean;
  setShowPasswordField: Dispatch<SetStateAction<boolean>>;
  setClickedMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  setLastUsedAuthMethod: Dispatch<SetStateAction<AuthMethod | undefined>>;
  setShowSSOOption: Dispatch<SetStateAction<boolean>>;
}>({
  authMethod: undefined,
  setAuthMethod: () => {},
  clickedMethod: undefined,
  showPasswordField: false,
  setShowPasswordField: () => {},
  setClickedMethod: () => {},
  setLastUsedAuthMethod: () => {},
  setShowSSOOption: () => {},
});

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
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
    error && toast.error(error);
  }, [searchParams]);

  const { isMobile } = useMediaQuery();

  useEffect(() => {
    // when leave page, reset state
    return () => setClickedMethod(undefined);
  }, []);

  const GoogleButton = () => {
    return (
      <Button
        text="Continue with Google"
        variant="secondary"
        onClick={() => {
          setClickedMethod("google");
          setLastUsedAuthMethod("google");
          signIn("google", {
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          });
        }}
        loading={clickedMethod === "google"}
        disabled={clickedMethod && clickedMethod !== "google"}
        icon={<Google className="size-4" />}
      />
    );
  };

  const GitHubButton = () => {
    return (
      <Button
        text="Continue with Github"
        variant="secondary"
        onClick={() => {
          setClickedMethod("github");
          setLastUsedAuthMethod("github");
          signIn("github", {
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          });
        }}
        loading={clickedMethod === "github"}
        disabled={clickedMethod && clickedMethod !== "github"}
        icon={<Github className="size-4 text-black" />}
      />
    );
  };

  const SignInWithSSO = () => {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setClickedMethod("saml");
          fetch("/api/auth/saml/verify", {
            method: "POST",
            body: JSON.stringify({ slug: e.currentTarget.slug.value }),
          }).then(async (res) => {
            const { data, error } = await res.json();
            if (error) {
              toast.error(error);
              setClickedMethod(undefined);
              return;
            }
            setLastUsedAuthMethod("saml");
            await signIn("saml", undefined, {
              tenant: data.workspaceId,
              product: "Dub",
            });
          });
        }}
        className="flex flex-col space-y-3"
      >
        {showSSOOption && (
          <div>
            <div className="mb-4 mt-1 border-t border-gray-300" />
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">
                Workspace Slug
              </h2>
              <InfoTooltip
                content={`This is your workspace's unique identifier on ${process.env.NEXT_PUBLIC_APP_NAME}. E.g. app.dub.co/acme is "acme".`}
              />
            </div>
            <input
              id="slug"
              name="slug"
              autoFocus={!isMobile}
              type="text"
              placeholder="my-team"
              autoComplete="off"
              required
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
        )}

        <Button
          text="Continue with SAML SSO"
          variant="secondary"
          icon={<Lock className="size-4" />}
          {...(!showSSOOption && {
            type: "button",
            onClick: (e) => {
              e.preventDefault();
              setShowSSOOption(true);
            },
          })}
          loading={clickedMethod === "saml"}
          disabled={clickedMethod && clickedMethod !== "saml"}
        />
      </form>
    );
  };

  const authProviders = [
    {
      method: "google",
      component: <GoogleButton />,
    },
    {
      method: "github",
      component: <GitHubButton />,
    },
    {
      method: "email",
      component: <SignInWithEmail />,
    },
    {
      method: "saml",
      component: <SignInWithSSO />,
    },
  ];

  const authMethodComponent = authProviders.find(
    (provider) => provider.method === authMethod,
  )?.component;

  const showEmailPasswordOnly = authMethod === "email" && showPasswordField;

  return (
    <LoginFormContext.Provider
      value={{
        authMethod,
        setAuthMethod,
        clickedMethod,
        showPasswordField,
        setShowPasswordField,
        setClickedMethod,
        setLastUsedAuthMethod,
        setShowSSOOption,
      }}
    >
      <AnimatedSizeContainer height>
        <div className="grid gap-3 p-1">
          {authMethod && (
            <div className="flex flex-col gap-2">
              {authMethodComponent}

              {!showEmailPasswordOnly && authMethod === lastUsedAuthMethod && (
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
              .filter((provider) => provider.method !== authMethod)
              .map((provider) => (
                <div key={provider.method}>{provider.component}</div>
              ))
          )}
        </div>
      </AnimatedSizeContainer>
    </LoginFormContext.Provider>
  );
}

const SignInWithEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const { isMobile } = useMediaQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingEmailPassword, setCheckingEmailPassword] = useState(false);

  const {
    showPasswordField,
    setShowPasswordField,
    setClickedMethod,
    authMethod,
    setAuthMethod,
    clickedMethod,
    setLastUsedAuthMethod,
    setShowSSOOption,
  } = useContext(LoginFormContext);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        // Check if the user can enter a password, and if so display the field
        if (!showPasswordField) {
          const { success } = emailSchema.safeParse(email);

          if (success) {
            try {
              setCheckingEmailPassword(true);
              const res = await fetch("/api/auth/account-exists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              setCheckingEmailPassword(false);

              const { accountExists, hasPassword } = await res.json();
              if (accountExists && hasPassword) {
                setShowPasswordField(true);
                return;
              }
            } catch (e) {
              console.error("Failed to determine if user has password", e);
            }
          }
        }

        setClickedMethod("email");

        if (!password) setShowPasswordField(false);

        fetch("/api/auth/account-exists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
          .then(async (res) => {
            const { accountExists, hasPassword } = await res.json();
            if (accountExists) {
              const provider =
                hasPassword && password ? "credentials" : "email";

              signIn(provider, {
                email,
                redirect: false,
                ...(password && { password }),
                ...(next ? { callbackUrl: next } : {}),
              }).then((res) => {
                if (!res) return;

                // Handle errors
                if (!res.ok && res.error) {
                  if (provider === "email") {
                    toast.error("Error sending email - try again?");
                  } else if (provider === "credentials") {
                    toast.error(errorCodes[res?.error]);
                  }

                  return;
                }

                // Handle success
                setLastUsedAuthMethod("email");
                if (provider === "email") {
                  toast.success("Email sent - check your inbox!");
                  setEmail("");
                } else if (provider === "credentials") {
                  router.push(next ?? "/");
                }
              });
            } else {
              toast.error("No account found with that email address.");
            }
          })
          .catch(() => {
            toast.error("Error sending email - try again?");
          })
          .finally(() => {
            setClickedMethod(undefined);
          });
      }}
      className="flex flex-col space-y-3"
    >
      {authMethod === "email" && (
        <div className="relative">
          <input
            id="email"
            name="email"
            autoFocus={!isMobile && !showPasswordField}
            type="email"
            placeholder="panic@thedis.co"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm",
              {
                "pr-10": checkingEmailPassword,
              },
            )}
          />
          {checkingEmailPassword && (
            <div className="absolute inset-y-0 right-0 flex h-full items-center pr-3">
              <LoadingSpinner className="size-5" />
            </div>
          )}
        </div>
      )}

      {showPasswordField && (
        <div>
          <Input
            type="password"
            autoFocus={!isMobile}
            value={password}
            placeholder="Password (optional)"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      <Button
        text={`Continue with ${password ? "Password" : "Email"}`}
        variant="secondary"
        icon={
          password ? (
            <InputPassword className="size-4 text-gray-600" />
          ) : (
            <Mail className="size-4 text-gray-600" />
          )
        }
        {...(authMethod !== "email" && {
          type: "button",
          onClick: (e) => {
            e.preventDefault();
            setShowSSOOption(false);
            setAuthMethod("email");
          },
        })}
        loading={clickedMethod === "email"}
        disabled={clickedMethod && clickedMethod !== "email"}
      />
    </form>
  );
};
