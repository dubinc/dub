import "dotenv-flow/config";

import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import {
  HUBSPOT_INTEGRATION_ID,
  SEGMENT_INTEGRATION_ID,
  SHOPIFY_INTEGRATION_ID,
  SLACK_INTEGRATION_ID,
} from "@dub/utils";
import * as z from "zod/v4";

// Encrypts plaintext credential fields on existing InstalledIntegration rows.
// Idempotent: a field that already round-trips through decrypt() is left alone.
function isAlreadyEncrypted(value: string) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    decrypt(value);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const installations = await prisma.installedIntegration.findMany({
    where: {
      integrationId: {
        in: [
          SLACK_INTEGRATION_ID,
          HUBSPOT_INTEGRATION_ID,
          SEGMENT_INTEGRATION_ID,
          SHOPIFY_INTEGRATION_ID,
        ],
      },
      credentials: {
        not: Prisma.DbNull,
      },
    },
    select: {
      id: true,
      integrationId: true,
      credentials: true,
    },
  });

  if (installations.length === 0) {
    console.log("No installations found");
    return;
  }

  for (const installation of installations) {
    const credentials = installation.credentials as Record<string, string>;

    if (!credentials || typeof credentials !== "object") {
      continue;
    }

    let encryptedCredentials: Record<string, any> | null = null;

    try {
      // Slack
      if (installation.integrationId === SLACK_INTEGRATION_ID) {
        if (isAlreadyEncrypted(credentials.accessToken)) {
          continue;
        }

        encryptedCredentials = {
          ...credentials,
          accessToken: encrypt(credentials.accessToken),
        };
      }

      // Hubspot
      else if (installation.integrationId === HUBSPOT_INTEGRATION_ID) {
        if (isAlreadyEncrypted(credentials.access_token)) {
          continue;
        }

        encryptedCredentials = {
          ...credentials,
          access_token: encrypt(credentials.access_token),
          refresh_token: encrypt(credentials.refresh_token),
        };
      }

      // Segment
      else if (installation.integrationId === SEGMENT_INTEGRATION_ID) {
        if (isAlreadyEncrypted(credentials.writeKey)) {
          continue;
        }

        const schema = z.object({
          writeKey: z.string(),
        });

        encryptedCredentials = schema.parse({
          ...credentials,
          writeKey: encrypt(credentials.writeKey),
        });
      }

      // Shopify
      else if (
        installation.integrationId === SHOPIFY_INTEGRATION_ID &&
        credentials?.accessToken
      ) {
        if (isAlreadyEncrypted(credentials.accessToken)) {
          continue;
        }

        encryptedCredentials = {
          ...credentials,
          accessToken: encrypt(credentials.accessToken),
        };
      }

      if (!encryptedCredentials) {
        continue;
      }

      await prisma.installedIntegration.update({
        where: {
          id: installation.id,
        },
        data: {
          credentials: encryptedCredentials,
        },
      });
    } catch (error) {
      console.error(`Failed to update installation ${installation.id}:`, error);
      continue;
    }
  }
}

main();
