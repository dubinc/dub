import { addDomainToVercel, setRootDomain } from "@/lib/api/domains";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const projectId = "xxx";
const domains: { domain: string; target: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("domains_to_add.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: any }) => {
      const domain = result.data["Domain Name"];
      if (domain.length > 0) {
        domains.push({
          domain,
          target: result.data["ReDirect To"],
        });
      }
    },
    complete: async () => {
      domains.slice(0, 10).forEach(async ({ domain, target }) => {
        const vercelResponse = await addDomainToVercel(domain);

        if (
          vercelResponse.error &&
          vercelResponse.error.code !== "domain_already_in_use" // ignore this error
        ) {
          console.error(vercelResponse.error.message);
          return;
        }

        let response = await prisma.domain.findUnique({
          where: {
            slug: domain,
          },
        });

        if (!response) {
          response = await prisma.domain.create({
            data: {
              slug: domain,
              projectId,
            },
          });
        }

        const effects = await setRootDomain({
          id: response.id,
          domain,
          domainCreatedAt: response.createdAt,
          projectId,
          url: target,
          rewrite: false,
        });

        console.log({ vercelResponse, prisma: response.id, effects });
      });
    },
  });
}

main();
