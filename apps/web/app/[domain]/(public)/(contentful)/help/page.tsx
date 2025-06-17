import { Metadata, NextPage } from "next";

import { contentfulClient } from "@/lib/contentful/contenful.config.ts";
import { HelpCenterCardsComponent } from "./elements/help-center-cards";
import { ISection } from "./types";

export const revalidate = 60;

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: { absolute: "GetQR: Help Center" },
  };
};

const HelpPage: NextPage = async () => {
  const entry = await contentfulClient.getEntry(
    process.env.HELP_ENTRY_ID || "",
  );

  const data = entry?.fields?.pageConfig as unknown as ISection[];

  return (
    <div className="mx-auto w-full">
      <HelpCenterCardsComponent data={data} />
    </div>
  );
};

export default HelpPage;
