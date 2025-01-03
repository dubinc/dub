import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  createHttpClient,
  STRIPE_API_KEY,
} from "@stripe/ui-extension-sdk/http_client";
import { createOAuthState } from "@stripe/ui-extension-sdk/oauth";
import { Banner, Button, Link, SignInView } from "@stripe/ui-extension-sdk/ui";
import { useEffect, useRef, useState } from "react";
import Stripe from "stripe";
import appIcon from "../icon.svg";
import {
  connectWorkspace,
  disconnectWorkspace,
  fetchWorkspace,
} from "../utils/dub";
import { getOAuthUrl, getToken, getUserInfo } from "../utils/oauth";
import { setSecret } from "../utils/secrets";
import { Workspace } from "../utils/types";

// You don't need an API Key here, because the app uses the
// dashboard credentials to make requests.
const stripe: Stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient() as Stripe.HttpClient,
  apiVersion: "2023-08-16",
});

const AppSettings = ({
  userContext,
  environment,
  appContext,
  oauthContext,
}: ExtensionContextValue) => {
  const credentialsUsed = useRef(false);
  const [oauthState, setOAuthState] = useState("");
  const [challenge, setChallenge] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const code = oauthContext?.code;
  const verifier = oauthContext?.verifier;
  const error = oauthContext?.error;

  // Verify token and connect workspace
  const verifyTokenAndConnectWorkspace = async () => {
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

    await connectWorkspace({
      stripe,
      workspaceId: workspace.id,
      accountId: userContext.account.id,
    });

    await setSecret({
      stripe,
      name: "dub_workspace",
      payload: JSON.stringify(workspace),
    });

    credentialsUsed.current = true;
    setWorkspace(workspace);
  };

  // Fetch the workspace for the current account
  useEffect(() => {
    fetchWorkspace({ stripe }).then((workspace) => {
      if (workspace) {
        setWorkspace(workspace);
      }
    });
  }, []);

  useEffect(() => {
    // if there is a workspace, we're done here
    if (workspace) {
      return;
    }

    // there is an ongoing oauth flow
    if (code && verifier && !workspace && !credentialsUsed.current) {
      verifyTokenAndConnectWorkspace();
      return;
    }

    // no oauth flow, no token, we need to start one
    if (!oauthState && !workspace) {
      createOAuthState().then(({ state, challenge }) => {
        setOAuthState(state);
        setChallenge(challenge);
      });
    }
  }, [workspace, oauthState, code, verifier]);

  if (workspace) {
    return (
      <Banner
        type="default"
        title="Dub account"
        description={`Connected to Acme Inc.`}
        actions={
          <Button
            onPress={() => {
              if (!workspace) {
                return;
              }

              disconnectWorkspace({
                stripe,
                workspaceId: workspace.id,
              });

              setWorkspace(null);
            }}
          >
            Disconnect
          </Button>
        }
      />
    );
  }

  return (
    <SignInView
      description="Connect your Dub workspace with Stripe to start tracking the conversions."
      primaryAction={{
        label: "Connect workspace",
        href: getOAuthUrl({ state: oauthState, challenge }),
      }}
      footerContent={
        <>
          Don't have an Dub account?{" "}
          <Link href="https://app.dub.co/register">Sign up</Link>
        </>
      }
      brandColor="#000000"
      brandIcon={appIcon}
    />
  );
};

export default AppSettings;
