import {
  getCustomDomainLandingPageData,
  getLandingPageCopy,
} from "@/lib/custom-domain-landing-page";
import { constructMetadata } from "@dub/utils";
import { LandingPage } from "./landing-page";
import PlaceholderContent from "./placeholder";

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const { rootLink, featuredLinks } = await getCustomDomainLandingPageData(
    params.domain,
  );
  const landingPageCopy = getLandingPageCopy({
    domain: params.domain,
    rootLink,
    featuredLinks,
  });

  return constructMetadata({
    title: landingPageCopy.title,
    description: landingPageCopy.description,
    image: landingPageCopy.image,
    video: landingPageCopy.video,
    url: `https://${params.domain}`,
  });
}

export default async function CustomDomainPage(props: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await props.params;
  const { rootLink, featuredLinks } =
    await getCustomDomainLandingPageData(domain);
  const landingPageCopy = getLandingPageCopy({
    domain,
    rootLink,
    featuredLinks,
  });

  if (!landingPageCopy.hasCustomContent) {
    return <PlaceholderContent domain={domain} />;
  }

  return (
    <LandingPage
      domain={domain}
      title={landingPageCopy.title}
      description={landingPageCopy.description}
      featuredLinks={featuredLinks}
    />
  );
}
