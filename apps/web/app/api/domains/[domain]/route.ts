import { addDomainToVercel } from "@/lib/api/domains/add-domain-vercel";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { markDomainAsDeleted } from "@/lib/api/domains/mark-domain-deleted";
import { queueDomainUpdate } from "@/lib/api/domains/queue-domain-update";
import { removeDomainFromVercel } from "@/lib/api/domains/remove-domain-vercel";
import { transformDomain } from "@/lib/api/domains/transform-domain";
import { validateDomain } from "@/lib/api/domains/utils";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { isNonEmptyJson } from "@/lib/api/utils/is-non-empty-json";
import { withWorkspace } from "@/lib/auth";
import { setRenewOption } from "@/lib/dynadot/set-renew-option";
import { storage } from "@/lib/storage";
import { updateDomainBodySchema } from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { combineWords, nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const updateDomainBodySchemaExtended = updateDomainBodySchema.extend({
  deepviewData: z.string().nullish(),
  autoRenew: z.boolean().nullish(),
});

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const domain = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    return NextResponse.json(transformDomain(domain));
  },
  {
    requiredPermissions: ["domains.read"],
  },
);

// PUT /api/domains/[domain] – edit a workspace's domain
export const PATCH = withWorkspace(
  async ({ req, workspace, params }) => {
    const existingDomain = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });
    const {
      slug: currentDomain,
      registeredDomain,
      partnerProgram,
    } = existingDomain;

    const {
      slug: newDomain,
      placeholder,
      expiredUrl,
      notFoundUrl,
      logo,
      archived,
      assetLinks,
      appleAppSiteAssociation,
      deepviewData,
      autoRenew,
    } = await updateDomainBodySchemaExtended.parseAsync(
      await parseRequestBody(req),
    );

    if (workspace.plan === "free") {
      if (
        logo ||
        expiredUrl ||
        notFoundUrl ||
        assetLinks ||
        appleAppSiteAssociation ||
        isNonEmptyJson(deepviewData)
      ) {
        const proFeaturesString = combineWords(
          [
            logo && "custom QR code logos",
            expiredUrl && "default expiration URLs",
            notFoundUrl && "not found URLs",
            assetLinks && "Asset Links",
            appleAppSiteAssociation && "Apple App Site Association",
            isNonEmptyJson(deepviewData) && "Deep View",
          ].filter(Boolean) as string[],
        );

        throw new DubApiError({
          code: "forbidden",
          message: `You can only set ${proFeaturesString} on a Pro plan and above. Upgrade to Pro to use these features.`,
        });
      }
    }

    const domainChanged =
      newDomain && newDomain.toLowerCase() !== currentDomain.toLowerCase();

    if (domainChanged) {
      if (registeredDomain) {
        throw new DubApiError({
          code: "forbidden",
          message: "You cannot update a Dub-provisioned domain.",
        });
      }

      const validDomain = await validateDomain(newDomain);
      if (validDomain.error && validDomain.code) {
        throw new DubApiError({
          code: validDomain.code,
          message: validDomain.error,
        });
      }

      const vercelResponse = await addDomainToVercel(newDomain);
      if (vercelResponse.error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: vercelResponse.error.message,
        });
      }
    }

    const logoUploaded = logo
      ? await storage.upload({
          key: `domains/${existingDomain.id}/logo_${nanoid(7)}`,
          body: logo,
        })
      : null;

    // If logo is null, we want to delete the logo (explicitly set in the request body to null or "")
    const deleteLogo = logo === null && existingDomain.logo;

    const updatedDomain = await prisma.domain.update({
      where: {
        id: existingDomain.id,
      },
      data: {
        ...(domainChanged && { slug: newDomain }),
        archived,
        placeholder,
        expiredUrl,
        notFoundUrl,
        logo: deleteLogo ? null : logoUploaded?.url || existingDomain.logo,
        ...(assetLinks !== undefined && {
          assetLinks: assetLinks ? JSON.parse(assetLinks) : Prisma.DbNull,
        }),
        ...(appleAppSiteAssociation !== undefined && {
          appleAppSiteAssociation: appleAppSiteAssociation
            ? JSON.parse(appleAppSiteAssociation)
            : Prisma.DbNull,
        }),
        ...(deepviewData !== undefined && {
          deepviewData: deepviewData ? JSON.parse(deepviewData) : Prisma.DbNull,
        }),
      },
      include: {
        registeredDomain: true,
      },
    });

    // Sync the autoRenew setting with the registered domain
    if (registeredDomain && autoRenew !== undefined) {
      const { autoRenewalDisabledAt } = registeredDomain;

      const shouldUpdate =
        (autoRenew === false && autoRenewalDisabledAt === null) ||
        (autoRenew === true && autoRenewalDisabledAt !== null);

      if (shouldUpdate) {
        await prisma.registeredDomain.update({
          where: {
            domainId: existingDomain.id,
          },
          data: {
            autoRenewalDisabledAt: autoRenew ? null : new Date(),
          },
        });

        // only set the autoRenew option on Dynadot if it's been explicitly disabled
        if (autoRenew === false) {
          waitUntil(
            setRenewOption({
              domain: currentDomain,
              autoRenew,
            }),
          );
        }
      }
    }

    waitUntil(
      (async () => {
        // remove old logo
        if (existingDomain.logo && (logo === null || logoUploaded)) {
          await storage.delete({
            key: existingDomain.logo.replace(`${R2_URL}/`, ""),
          });
        }

        if (domainChanged) {
          await Promise.all([
            // remove old domain from Vercel
            removeDomainFromVercel(currentDomain),

            // trigger the queue to rename the redis keys and update the links in Tinybird
            queueDomainUpdate({
              oldDomain: currentDomain,
              newDomain: newDomain,
              ...(partnerProgram && { programId: partnerProgram.id }),
            }),

            ...(partnerProgram
              ? [
                  prisma.program.update({
                    where: {
                      id: partnerProgram.id,
                    },
                    data: {
                      domain: newDomain,
                    },
                  }),
                  prisma.partnerGroupDefaultLink.updateMany({
                    where: {
                      programId: partnerProgram.id,
                    },
                    data: {
                      domain: newDomain,
                    },
                  }),
                ]
              : []),
          ]);

          // only need to run invalidations on currentDomain if domain was not changed
        } else {
          // invalidate static / isr cached for notfound links
          if (
            notFoundUrl !== undefined &&
            notFoundUrl !== existingDomain.notFoundUrl
          ) {
            revalidateTag(`static:${currentDomain.toLowerCase()}`);
            revalidatePath(`/${currentDomain.toLowerCase()}/notfound`);
          }

          // invalidate static / isr cached for expired links
          if (
            expiredUrl !== undefined &&
            expiredUrl !== existingDomain.expiredUrl
          ) {
            revalidateTag(`static:${currentDomain.toLowerCase()}`);
            revalidatePath(`/${currentDomain.toLowerCase()}/expired`);
          }

          // invalidate wellknown cache if any of the wellknown files have changed
          if (
            appleAppSiteAssociation !== undefined ||
            assetLinks !== undefined
          ) {
            revalidateTag(`wellknown:${currentDomain.toLowerCase()}`);
          }
        }
      })(),
    );

    return NextResponse.json(transformDomain(updatedDomain));
  },
  {
    requiredPermissions: ["domains.write"],
  },
);

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const {
      slug: domain,
      registeredDomain,
      partnerProgram,
    } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    if (registeredDomain) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot delete a Dub-provisioned domain.",
      });
    }

    if (partnerProgram) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You cannot delete a domain that is actively in use in a partner program.",
      });
    }

    await markDomainAsDeleted({
      domain,
    });

    return NextResponse.json({ slug: domain });
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
