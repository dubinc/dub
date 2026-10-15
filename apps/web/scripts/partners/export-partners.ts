import { prisma } from "@/lib/prisma";
import { PlatformType } from "@prisma/client";
import { subDays } from "date-fns";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const platformTypes = Object.values(PlatformType);

// export partners approved or trusted in the Dub network
async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      networkStatus: {
        in: ["approved", "trusted"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      description: true,
      country: true,
      companyName: true,
      profileType: true,
      networkStatus: true,
      platforms: {
        select: {
          type: true,
          identifier: true,
          verifiedAt: true,
          subscribers: true,
        },
      },
    },
  });

  const partnerIds = partners.map((partner) => partner.id);

  if (partnerIds.length === 0) {
    console.log("Exporting 0 partners");
    fs.writeFileSync("dub_network_partners.csv", Papa.unparse([]));
    return;
  }

  const [l90dCommissions, enrollments] = await Promise.all([
    prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        partnerId: {
          in: partnerIds,
        },
        status: {
          in: ["pending", "processed", "paid"],
        },
        createdAt: {
          gte: subDays(new Date(), 90),
        },
      },
      _sum: {
        earnings: true,
      },
    }),
    prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        status: "approved",
      },
      select: {
        partnerId: true,
        program: {
          select: {
            categories: {
              select: {
                category: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const l90dCommissionsByPartnerId = new Map(
    l90dCommissions.map(({ partnerId, _sum }) => [
      partnerId,
      _sum.earnings ?? 0,
    ]),
  );

  const categoriesByPartnerId = enrollments.reduce((map, enrollment) => {
    const categories = map.get(enrollment.partnerId) ?? new Set<string>();

    for (const { category } of enrollment.program.categories) {
      categories.add(category);
    }

    map.set(enrollment.partnerId, categories);
    return map;
  }, new Map<string, Set<string>>());

  const rows = partners.map(
    ({
      id,
      name,
      description,
      country,
      companyName,
      profileType,
      networkStatus,
      platforms,
    }) => {
      const platformsByType = Object.fromEntries(
        platforms.map((platform) => [platform.type, platform]),
      );

      return {
        id,
        name,
        description,
        country,
        companyName,
        profileType,
        networkStatus,
        l90dCommissions: l90dCommissionsByPartnerId.get(id) ?? 0,
        categories: [...(categoriesByPartnerId.get(id) ?? [])]
          .sort()
          .join(","),
        ...Object.fromEntries(
          platformTypes.flatMap((type) => {
            const platform = platformsByType[type];
            const followers = platform ? Number(platform.subscribers) : "";

            return [
              [type, platform?.identifier ?? ""],
              [`${type}Verified`, Boolean(platform?.verifiedAt)],
              [
                type === "website"
                  ? "websiteDomainRanking"
                  : `${type}Followers`,
                followers,
              ],
            ];
          }),
        ),
      };
    },
  );

  console.log(`Exporting ${rows.length} partners`);

  fs.writeFileSync("dub_network_partners.csv", Papa.unparse(rows));
}

main();
