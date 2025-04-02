import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import { createOAuthState } from "@stripe/ui-extension-sdk/oauth";
import {
  Banner,
  Box,
  Button,
  Link,
  SignInView,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../hooks/use-workspace";
import appIcon from "../icon.svg";
import { updateWorkspace } from "../utils/dub";
import {
  getOAuthUrl,
  getToken,
  getUserInfo,
  getValidToken,
} from "../utils/oauth";
import { deleteSecret, setSecret } from "../utils/secrets";
import { stripe } from "../utils/stripe";

const AppSettings = ({ userContext, oauthContext }: ExtensionContextValue) => {
  const credentialsUsed = useRef(false);
  const [oauthState, setOAuthState] = useState("");
  const [challenge, setChallenge] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { workspace, isLoading, mutate } = useWorkspace(stripe);

  const code = oauthContext?.code;
  const verifier = oauthContext?.verifier;

  // Disconnect workspace
  const disconnectWorkspace = async () => {
    setDisconnecting(true);

    const token = await getValidToken({ stripe });

    await Promise.all([
      deleteSecret({
        stripe,
        name: "dub_workspace",
      }),

      deleteSecret({
        stripe,
        name: "dub_token",
      }),
    ]);

    if (token) {
      await updateWorkspace({
        token,
        accountId: null,
      });
    }

    await mutate();
    setDisconnecting(false);
  };

  // Exchange code for token
  // Fetch the workspace info for the current user
  // Connect the workspace to the stripe account
  // Store the token and workspace info in the secrets
  const connectWorkspace = async () => {
    setConnecting(true);

    if (!code || !verifier) {
      return;
    }

    const token = await getToken({ code, verifier });

    if (!token) {
      return;
    }

    await setSecret({
      stripe,
      name: "dub_token",
      payload: JSON.stringify(token),
    });

    const workspace = await getUserInfo({ token });

    if (!workspace) {
      return;
    }

    await updateWorkspace({
      token,
      accountId: userContext.account.id,
    });

    await setSecret({
      stripe,
      name: "dub_workspace",
      payload: JSON.stringify(workspace),
    });

    await mutate();
    credentialsUsed.current = true;
    setConnecting(false);
  };

  useEffect(() => {
    // if there is a workspace, we're done here
    if (workspace) {
      return;
    }

    // there is an ongoing oauth flow
    if (code && verifier && !workspace && !credentialsUsed.current) {
      connectWorkspace();
      return;
    }

    // no oauth flow, no token, we need to start one
    if (!oauthState && !workspace) {
      createOAuthState().then(({ state, challenge }) => {
        setOAuthState(state);
        setChallenge(challenge);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, oauthState, code, verifier]);

  if (isLoading || connecting) {
    return <Spinner size="large" />;
  }

  return (
    <Box css={{ width: "6/12", stack: "y", gap: "large" }}>
      {workspace ? (
        <Banner
          title="Dub workspace"
          description={`Connected to ${workspace.name}`}
          actions={
            <Button
              type="destructive"
              size="small"
              disabled={disconnecting}
              onPress={async () => {
                setDisconnecting(true);
                await disconnectWorkspace();
                await mutate();
                setDisconnecting(false);
              }}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          }
        />
      ) : (
        <SignInView
          description="Connect your Dub workspace with Stripe to start tracking the conversions."
          primaryAction={{
            label: connecting
              ? "Connecting please wait..."
              : "Connect workspace",
            href: connecting
              ? "#"
              : getOAuthUrl({ state: oauthState, challenge }),
          }}
          footerContent={
            <>
              Don&apos;t have an Dub account?{" "}
              <Link href="https://app.dub.co/register" target="_blank" external>
                Sign up
              </Link>
            </>
          }
          brandColor="#000000"
          brandIcon={appIcon}
        />
      )}
    </Box>
  );
};

export default AppSettings;
