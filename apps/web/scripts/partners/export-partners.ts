import { prisma } from "@/lib/prisma";
import { PlatformType } from "@prisma/client";
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
