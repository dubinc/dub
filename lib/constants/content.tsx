import { Logo } from "#/ui/icons";
import { allHelpPosts } from "contentlayer/generated";
import {
  Airplay,
  BarChart,
  Globe,
  Import,
  Link2,
  Lock,
  QrCode,
  Settings,
  Users,
  Webhook,
} from "lucide-react";

export const BLOG_CATEGORIES: {
  title: string;
  slug: "company" | "education";
  description: string;
}[] = [
  {
    title: "Company News",
    slug: "company",
    description: "Updates and announcements from Dub.",
  },
  // {
  //   title: "Education",
  //   slug: "education",
  //   description: "Educational content about link management.",
  // },
  // {
];

export const POPULAR_ARTICLES = [
  "what-is-dub",
  "what-is-a-project",
  "how-to-add-custom-domain",
  "how-to-use-tags",
  "how-to-invite-teammates",
  "pro-plan",
];

export const HELP_CATEGORIES: {
  title: string;
  slug:
    | "overview"
    | "getting-started"
    | "link-management"
    | "custom-domains"
    | "migrating"
    | "api"
    | "saml-sso";
  description: string;
  icon: JSX.Element;
}[] = [
  {
    title: "Dub Overview",
    slug: "overview",
    description: "Learn about Dub and how it can help you.",
    icon: <Logo className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Getting Started",
    slug: "getting-started",
    description: "Learn how to get started with Dub.",
    icon: <Settings className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Link Management",
    slug: "link-management",
    description: "Learn how to manage your links on Dub.",
    icon: <Link2 className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Custom Domains",
    slug: "custom-domains",
    description: "Learn how to use custom domains with Dub.",
    icon: <Globe className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "Migrating to Dub",
    slug: "migrating",
    description: "Easily migrate to Dub from other services.",
    icon: <Import className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "SAML SSO",
    slug: "saml-sso",
    description: "Secure your Dub project with SAML SSO.",
    icon: <Lock className="h-6 w-6 text-gray-500" />,
  },
  {
    title: "API",
    slug: "api",
    description: "Learn how to use the Dub API.",
    icon: <Webhook className="h-6 w-6 text-gray-500" />,
  },
];

export const getPopularArticles = () => {
  return POPULAR_ARTICLES.map(
    (slug) => allHelpPosts.find((post) => post.slug === slug)!,
  );
};

export const FEATURES_LIST = [
  {
    title: "Powerful analytics for the modern marketer",
    shortTitle: "Advanced Analytics",
    accordionTitle: "Analytics that matter",
    description:
      "Dub provides powerful analytics for your links, including geolocation, device, browser, and referrer information.",
    icon: BarChart,
    slug: "analytics",
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/analytics.png",
    thumbnailBlurhash:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAdCAYAAADoxT9SAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE+0lEQVR4nL2Y63qiShBF5/2f8czkpjGCgoLQV+yzq6saGpVMYjznx/ok0JBa7GrQ/mWsC7fQhLE3MEEJl8eMteP51hH+L8g4e81SXUv8WhS5KFJpwlyhdSZicpGpYCf8VSgT+09EliQYPs5j3ZVIknA+41O5+9K5S6RXE0lEJZEok6Xhhwx/zaLU99L5lkguMJGOuyiiMxHnWMB/wi2py3TMF5L5skifiXQzbJTpIZJkpkQykWGBeHxJRtpLtn8s0pNILtGbcIrYSEcoJzIe53hcY2CRJCOFDxfM0xlGmVtz50EiNt79Too/dUxLn72LRBnlRWaYZPwZEsxwwf8iYpKItE+SaEWgOREu0naEx3EPoQEyQyZDBU8yudRcYrieJ9bHVr17sjOTCKWRJBpwhMShJdzIsfXY73GchIYo1Eehc5QhHOEzpP1szlh8zo9FXBQZJSBwhEDd2FAdbdgfXNhl7I8e+32o2wFSA6SGKNXrc0QRhtH2HFOb468Rkfw99U0RPpl6n+YAtc8RbVQ3VDAKr10oKhe2xF6oPPb5UNYeYgOkBqTFQi3RE2dc74zrnmNqiT4m6EdorqlR5oEiNBeohaqG7z5JfKD4zc6F91LYefztsd9HKRLaQ4YSOkhKKak2kzsJnfIjc5kHiVAaSYTSKGuWoOLXhQurrQtvwqrwYV36KEVClBClQ0KUUNVcivkoRnMrPTBOSUY5kZEX7iNExraSNCgJkqDiXz9ceNlM0N9vWwgVnFBquaJObedZiuZTQ3PKQ2x6WLCQm95PhnmoCLXVVtJYicTzuwtPxFrA9rMI0RgaG1vuou121HoHzw+JJskg/Y7/J8lwKm5M5X6RNNHH+WEhYlGcxV23SMCicBv+rG34vWJom/Y9gyhTcHrrMknxQ4KSpTblJx7fqPgoP00ieSp3iWiJs5NHL4nQY/emCAr/IxL/yOfvNQs9b0iGxxKrwkLIRpmPPQslmUpkUiozEf0TEW0zEXslskJhrxuDO29QtIFAxpr3PeHYy4eJMq+ZzPuOZPhaRWVDeZEKPVwelAh/841vdXkZHhp6CRr8Y4N+N+G9MCgMhYrMkxSfBIjnDUmALfOGc9alYZG9iNR8g/afJXKXSP4VPooYiBikYkJ9NJikkNlPMqstF5uEqHjiZaORhoasUGikwSIbnPuBa2xxU0oRqXCj6ofOkZkIf3VvSQYih0YjFR3KSk8yKGxNRVKxeeHCqmDWJbPZ6VGiwE3hNLh16Tscpc8i9gdPrdmPKjOKUCrtSSMVjVRYZldDBkLbPQpDcRsU+V5OBSfedxMbGkvngDJKGEiYmAZJHE/p54Edf7j9UMRkIjp0nQ4niDQQOSKVA2TqwyQUExKpSBKMRauRgsaCHZ2La1SQqBskjbRJohGJUWS2LpCWnr4gkiR0WnBQOvQkEmUUZBRkmCjUcEKVSEUxoYyoGbujYgE6j6B2pfl3MlMSszQmrtfSFkTGQeOqiRYRFSGRJEO0klBMqWWpQyqw4WKrRuGuK/4UahpL55yYhtpWfj4vSdwSSSyIpDRYQilIKCUy/UyIkbYDbSdyHcOFqjkYk463PUNrAGlBo8/baXEN7SsicQVRi4jK6IPqM2bHcmk90gknyEdwvItgP67fC2Oxhlcvk4ReWBi8KXJl+ImIvkSrYCI6bjPYNowai1UZ2G8meKy5zeIK51zoX56UB7vUOlYfAAAAAElFTkSuQmCC",
    videoUrl:
      "https://www.youtube.com/embed/i05FamHTn_I?si=gRnWs5Kf2n6Qyqmd&autoplay=1",
    videoLength: "2:56",
    bentoTitle: "Detailed insights for every click",
    bentoDescription:
      "Dub provides detailed analytics for every click on your links. See where your audience is coming from and what devices they are using.",
    bentoFeatures: [
      {
        title: "Time-series data",
        description:
          "See how your links are performing over time with a beautiful time-series chart.",
        image:
          "https://d2vwwcvoksz7ty.cloudfront.net/features/time-series-data.png",
      },
      {
        title: "Geographic data",
        description:
          "Understand your audience with geographic data – on both a country and city level.",
        image: "https://d2vwwcvoksz7ty.cloudfront.net/features/geo-data.png",
      },
      {
        title: "Device data",
        description:
          "See what devices your audience is using to click on your links",
      },
      {
        title: "Referrer data",
        description:
          "Understand which websites are driving the most traffic to your links.",
      },
      {
        title: "404 monitoring",
        description:
          "Monitor your links for 404 errors and notifies you when they occur.",
      },
    ],
  },
  {
    title: "Branded Links that Stand Out",
    shortTitle: "Branded Links",
    accordionTitle: "Use your own domain",
    description:
      "Dub offers free and unlimited custom domains on all plans for you to create branded links that stand out.",
    icon: Airplay,
    slug: "branded-links",
    thumbnail:
      "https://d2vwwcvoksz7ty.cloudfront.net/features/branded-links.png",
    thumbnailBlurhash:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAdCAYAAADoxT9SAAAACXBIWXMAAAsTAAALEwEAmpwYAAADYElEQVR4nMWY2XLDIAxF/f9/28QGs5myCSQBXtLM9OFO09axdXwlIVjccXjnotyJjqZw/UHkv6B83/gsY63XWvt9V15K6YUQfts2v64rVfjbtgkvwjX7vvsFgrVRNsoyuV7p+iPJcR0j2GulGMLzjDFeKZWCwxDv99u/ol7v9DlqXQNMuCYCLzMAg2Xgs6vK3zkqUAf2RxBwI775BPF6UUWYABhB43WL5QGHG0VpIjtQADKOwR0V7inQFGSlID8/ABNdKSkWQXLwWTVwTaWIbFWEwSJAD2F6kJZab0itgSMIxHQAOWAdbpi1KzOQRVAuCbuUa+k+TAeSakSmguY18io1QkD6N48BivYsuZsqgOFAZzBTiA5Ep2LnXSumUi70NUOsuXNtAXhRGIBDVACuBiQLDABp3dIMOtyVKxQkt1/oXA2mACWorbbf6EZswQsEX99+ukG0tkiqcCGW9ltQ/CmIQwimuPIcpKwjJr/YncAUIIAS2YkIIUI9LRxCIggCIFT4YpBUCSTDmAYzAAFXnoBAeun6ggGmAFWoBhH/t7Q64C7sSZtoWgvMWqGoM7FucEdrIO6y4OvCDOuYgbqFNCtAAAWfS8yXIBRGUU1AtM5rDQe504LppEHXN9pZNanrBYq6r4nY/rgjIIABEH0DxN1owf3c10YjDGUrFDSrhUBwEJZa3BVRHJEcpDzMfhuEL95PQMQEYisdDFpyghiBuPupNYKxCAaPUpcgo5QaCbqZLGtNdsOktDKD+rg/c30T5ARGJDWI7IauNxyn1ZMp+EMQ+YEjojgiU0ssIMwR2Mu4/0st2noBLAe/lwUIIFQdaVJbTFuAEYR7tDdpQPPOxYfcOQh6+y2lKExapDCIxiAWFfonjhydIyOQi641d0RiRwpEXJSuHLm3IJ61X/dJ+/0wtYojBu/3B4cYVy58ZR3BqTXURWrR9HJdwXOYuxB1xK8aguh5sU8gKsgO6WXmrkxg7kFQNxJEGoMGINNZawIiCojEICS9TH0wP1I6Oz8bHT2Zk5SiIGgnWIHkaEPV/o5rBIN0riBNz8guxO/zfRCUWgRGzWHwin8n6A6CpVQFUQbvR/oUmwoBcAgMMoN5Ihx8fzQ1Aqn7Ev0YpINh52K6jC51oDwNmmtwxlYn7fb7L/LDQmuPkz48AAAAAElFTkSuQmCC",
    videoUrl:
      "https://www.youtube.com/embed/LbgvQxLVqq4?si=7_sJVXFZINPxbAdM&autoplay=1",
    videoLength: "3:23",
    bentoTitle: "Impress your audience with branded links",
    bentoDescription:
      "Create custom short links that match your brand and stand out from the crowd, with free and unlimited custom domains on all plans.",
    bentoFeatures: [
      {
        title: "Unlimited custom domains",
        description:
          "Add as many custom domains as you want to your project at no extra cost.",
        image: "https://d2vwwcvoksz7ty.cloudfront.net/features/domains.png",
        href: "/help/article/how-to-add-custom-domain",
      },
      {
        title: "Custom Social Media Cards",
        description:
          "Customize the title, description, and image of your links when shared on social media.",
        image:
          "https://d2vwwcvoksz7ty.cloudfront.net/features/social-cards.png",
        href: "/help/article/how-to-create-link#custom-social-media-cards",
      },
      {
        title: "Free SSL certificates",
        description:
          "Dub automatically provisions SSL certificates for your custom domains.",
      },
      {
        title: "Link cloaking",
        description:
          "Hide your destination URL with link cloaking to make your links look cleaner.",
        href: "/help/article/how-to-create-link#link-cloaking",
      },
      {
        title: "Custom QR codes",
        description:
          "With Dub Pro, you can create branded QR codes for your links.",
        href: "/features/qr-codes",
      },
    ],
  },
  {
    title: "Free QR Code Generator",
    shortTitle: "QR Codes",
    accordionTitle: "Free QR Code Generator",
    description:
      "QR codes and short links are like peas in a pod. Dub offers free QR codes for every short link you create.",
    icon: QrCode,
    slug: "qr-codes",
    thumbnail: "https://d2vwwcvoksz7ty.cloudfront.net/features/qr-codes.png",
    thumbnailBlurhash:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAdCAYAAADoxT9SAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFvklEQVR4nL2Y23qaUBCF+/7v1CZpG1uTeD4jooIgCHISMb2arhnEIzbaNrmYD90aMv9ea2Y2flqnr5SsN9dFuqH1SeRrb/1t9v1XiZRjw/GL0tdftDkJWZd4PYv8Hqfx6X+AHH5nlXCk29jsIkkOoNZboC1MMUgBxJsg6eGubZMr2uU3QCTpVUrxhdhByfe3SSC5zeYyyKXEC0EOLXJppw9B1yd24uQ40ShGRCmFHOGagjBFZFde48/jmGFzoFyZ/waSx7kqR0kXAmwkQU7YD9a09BHLhLyDWC7xGdYDfJ4BZX9XBHKtla4GubT7pwpkAFnCrruixWJFjhOTvQu8x5rrJgLIsGGYweSqpFuY09r47yB7m2VFHK94Z3MAJO/GNLcjsuYhmWZIxizYRkgzvDetiGw7Fkgvh4nSE1VuK+43QHKYY7BDiEggsLs+EnM5wQDJ+6TrHk0mHmljl0YaYuSSpnk0Hi9pOvVpBqj5PBIYthrXjYAkm0KQWyAugJxHZqdcCSTiIyE3gAJLMgwXyTo0VOc0GFjU61vU7ZkIfo01xSFVXQByCZhAlHG9TJXcXoUgN0DcAMJq8D9GAiEngt21GWIBCJuUISduULutU7OpU6ORXVutGXW7FgBtUUjXfcDzJqy2IOnHgxyq4SxgFRNKTOZQgiE48QnVahpVKhq9vPB1jPdTrBsCMxw6ogrXENuLuxiDXLTW+4EkFEQxipXV8Eg3bFJHJuzDyXLiKj09KfSzjPipULk8pOdnjWrVCZQxRJXx2BN7OYtYQHimJElxsb8LyIpBYKsgjGArtgerAcsoOrU7vPNDQAzox48ePT5mUSoNAKOKQk1YrY960dAEGGTBILDWn7rWu4FIfQTsbxSt6aA7zaDGhBpNFVbqA6JD37616OGhSQ/3Lfr6tS1AZShUrWrU6Rgoeht1skTBh+hcK9xzvTuy5DC3dqvbQJI9iLNAkZtsK/a+RvW6AjW69P07AB7qdHdXoy9fanR/1wBMi36UevTyrEgNKQMTdbKgueWT50XSxnmwsnWPZ9dHgcwykE53RLU6W6gDkAbd3zNEhT5/rtAdYL5CnVKpA5CB1NFgMAOIQ5a1lM4XhitpInz/87PcO1vLEWuhnWpQpAdFGgN6eu7ARqwAlLhniAquVVitAcu1qQLrtQCiDAyA2FDEKwD5N1Wu71rbYpcasbIa6fdRyC0FBd1Fp2pClTpgqrAYIADFcOVym6qVPmbMiBQ0hyladgYS4H6x3JdnlICsPwKE268MQ+5amNRTE4lNUMQq6qSPVtsGTIMeS3UA1aj0WBe4Z6hVr/XxvRFmCUCmFkBcHCJ9nIYjKJ2pkpyp8i4gm+1A5DkSYI5gShtz1IkuqrSgSq2Gon5pU/mpKUDlclPgqtUu6mNAPdhQVXV0LYBgI3hD9iB7VZL3BsmOKDzZQyl4E/ZiVVR1CpgRrKPgaNIDUAdWY4A2XjMEq6Gg0DXMER3HGotsAVkCJJTN+WCQA3tBFdtxpXtNpjMoM5VEu70hgAZQqC/Br7tdBaAqgCcodAMDESB2BuJvQaL4HOTWoXg1yNF5SwajLxbjDjbVTdntIZIdKJoknoeijAAxRnNAfegznLXmePByL4Lkavzjo+6l2OxUiaR7ZRZjGFbGgs2M2RyFbOI8ZaA1T3ehjaeihA4IVmM+d3BE8VBrfqG1TkGuBboS5FVa475Wkp0yHtoot2Qb6lhIkhXiOtA5oBRfDQCwEvx5rsbSD6Sd74t9PxT/5mnxepCDWtk/KfJzRSzquDmQ48FyC0maleIrq8BrDLFwMzX2ttqDrNMPBDl8WsyV4QbAzyl8xOf5wEAO7MNQfOVgAFYihzhW48+2usZefwVyCYaPMKwOzxoXCfOsyIMB2E45hNTGH211/mvj+jBOQa7+uXR9+pMQQLYwfMyIomMgTpihOHwOBsB6DlE0CI8T/3UhihX6DZrKi05GV59sAAAAAElFTkSuQmCC",
    videoUrl:
      "https://www.youtube.com/embed/fcWkUZoJJ7w?si=LKNOO67aL6Q-3xN4&autoplay=1",
    videoLength: "1:07",
    bentoTitle: "Gorgeous QR codes for your links",
    bentoDescription:
      "Create beautiful flyers and posters with QR codes for your links.",
  },
  {
    title: "Personalize Your Short links",
    shortTitle: "Personalization",
    accordionTitle: "Personalize Your Short links",
    description:
      "Customize your link's behavior with device targeting, geo targeting, link cloaking, and more.",
    icon: Link2,
    slug: "personalization",
    thumbnail:
      "https://d2vwwcvoksz7ty.cloudfront.net/features/personalization.png",
    thumbnailBlurhash:
      "data:image/png;base64,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",
    videoUrl:
      "https://www.youtube.com/embed/K2UdLK8k1I4?si=79hu5XSW9pSjODOm&autoplay=1",
    videoLength: "2:25",
    bentoTitle: "Optimize your links for every audience",
    bentoDescription:
      "Get the most out of every click by delivering the right experience to the right audience.",
    bentoFeatures: [
      {
        title: "Device targeting",
        description:
          "Redirect your audience to different destinations based on their device type (e.g. iOS/Android).",
        image:
          "https://d2vwwcvoksz7ty.cloudfront.net/features/device-targeting.png",
        href: "/help/article/how-to-create-link#device-targeting-ios--android",
      },
      {
        title: "Geo targeting",
        description:
          "Redirect your audience to different destinations based on their country of origin.",
        image:
          "https://d2vwwcvoksz7ty.cloudfront.net/features/geo-targeting.png",
        href: "/help/article/how-to-create-link#geo-targeting",
      },
      {
        title: "Expiration dates",
        description:
          "Automatically disable your links after a certain date & time.",
        href: "/help/article/how-to-create-link#expiration-date",
      },
      {
        title: "Password protection",
        description:
          "Protect your links with passwords to prevent unauthorized access.",
        href: "/help/article/how-to-create-link#password-protection",
      },
      {
        title: "Link cloaking",
        description:
          "Hide your destination URL with link cloaking to make your links look cleaner.",
        href: "/help/article/how-to-create-link#link-cloaking",
      },
    ],
  },
  // { title: "Programmatic Link Creation", shortTitle: "API", slug: "api" },
  {
    title: "Collaborate With Your Team",
    shortTitle: "Team collaboration",
    accordionTitle: "Collaborate With Your Team",
    description:
      "Invite your teammates to collaborate on your links. For enterprises, Dub offers SAML SSO for better security.",
    icon: Users,
    slug: "collaboration",
    thumbnail:
      "https://d2vwwcvoksz7ty.cloudfront.net/features/collaboration.png",
    thumbnailBlurhash:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAdCAYAAADoxT9SAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE0UlEQVR4nM2YC3eiWBCE5///yIlRQN6vyxu0p6ovILLZTMzDXc+pg6AJ/VnVfYFf8g2v6/Uql8tl1TRNq8ZxvNP2s+X7/HvqK69f3wGxgOyLH4bhTW2hvgvmW0D2EEvBfd+/qbdg/hOQ5aQW4opiLijqBsFiu65TtW27UTcfvwfaw3wG6CGQPYB1wkJYgEE6FMiCGxTeNI2qrqH5/QJFoC3M00DuIS4rBH/NYRhXFxRCi6+lqqhqo1qPL0DWme9x5UMg70GwiH5xAQWyWGOMFGUpRVFInlO5brlf4jg/r2agxZnFlc/2yxdAFohBWhTD+BhTKUCW5ZKmmSRJInFMxbrlPo8TjEB0aYFhxL7S+A+B3ENMa2M3TatOlKXRIpMk1cLDKJIwDCWAuI2wz+Npms4wRqPGmP04yJsQu0jRDQtRKEQUxRIEofh+IOezv4r7BKJDdIZRW1zZxut5IPOYZbNaNxCpotTiothCsHDXO4vjepArLrYe9i1MpDGjK+yXLQj//2ca/iGQ26ide2N1o0JfFPilU0BEcvZ8cRxPTkdXjkdnleO4KwxdIzh7hfFin/w8yOW6cwMgHUCaDm40cMOgqFyiMBH/HIrrnBXi9eDI4XCCjnh/UhgXgHSLrqSIIZ2sq/qu4Xm+HwHRxW8Zt4AY4Ea/xMrUUuQASXIJgxhuBOKcznJ8deXwAoiX46rjK1w5eepYGETaTytI+0yQ8QbStYM0dSumrCXPjCQxQRI5u+E9yO8F5rQBCRQ6SbLng0wzyNAzVqOC1FUnpmgkTwESAcSfQY6+HA+evL4gWr8hbBmzE+AYO8YvCtEjACkRyxrxtCCjnucG8mGOx0DGLUizBykAkgIkEvcUoGi48kIYNPzBVYec41k8N5DAx3oSpZKluQ4KDgxOwKeBTOMFINMK0gCkKlopMkytuJQoyCXw4IpDGDjz6lvBIffki+dgbTlH+B4WRUQxz0rtMfYahwdje9mDfBDmQUf2IP0MUgPESBzClXMmvmthPMCoAMDI+V6s8UuiTLKk0CFRmUann714nJ4DMg1bkHEG6aTMEK+kkiSEK36uMHSGQL4bK0BwTjR6cZihNwodEKbA1XCFq+CWV8HjT4PIPLWuGq1RQSYFaSv0SdmLyeFKSlcsTBwUChQBSOVnOJbpQEhjC1EWlbrR1J0ODvbe9FwQuAKQvpmkrQFitq4AJsKaApgEMSNQjL7hew6DFH3EwVDklY5tuqGx6v4HII0ZFMRkdGWGgTMpgaJSxUGQJcZCYDAwUuoGhkXb9BZkuEWL53t0cr0Pcv1LtGYQxkthEDE6QyBGTYVBUFJ5o6O6Klt1gpEiBGPF/hgGe2swzSCXnwJZxu+4aXYFQcMv8TKYYAqjQuFafKsiQGVaXXuaup8hrBsWZLyBLK48sLp/AOTfxi9BAMHJZex6woIJsBedMGWjcbrBdHcw7BGuI9Pqyg3myyDX90AQiQWkJkjZasElldc3FVYEMcbC2GjxKQsfVvChhX0Cc+fK5fJQvB4EmWaQ5aKx11+XvzILVYii1qm0VUlh3JZlrdPKwjR3MP0MM+5gPhqvv4D88yHcclPFSLCIum71nsSCAKKo9P6Eq/aqwoq3w7y2MqaeHw01enliH9z1O1ceezz0B49+MX0EZnFXAAAAAElFTkSuQmCC",
    videoUrl:
      "https://www.youtube.com/embed/_m9RM8L6TOw?si=49_XIkQ7g-61dRtV&autoplay=1",
    videoLength: "2:13",
    bentoTitle: "Seamless collaboration for marketing teams",
    bentoDescription:
      "View and manage your team's links in one place, with fine-grained permissions and SAML SSO for enterprises.",
    bentoFeatures: [
      {
        title: "Unlimited teammates",
        description:
          "All paid plans come with unlimited teammates, so you can work with your team without worrying about extra costs.",
        image: "https://d2vwwcvoksz7ty.cloudfront.net/features/teammates.png",
        href: "/help/article/how-to-invite-teammates",
      },
      {
        title: "SAML SSO",
        description:
          "Dub offers SAML SSO for enterprises to provide better security and control over their projects.",
        image: "https://d2vwwcvoksz7ty.cloudfront.net/features/saml.png",
        href: "/help/category/saml-sso",
      },
      {
        title: "Tags & comments",
        description:
          "Organize your links with tags and comments to provide context for your team.",
        href: "/help/article/how-to-use-tags",
      },
      {
        title: "Fine-grained permissions",
        description:
          "Enterprises on Dub can set role-based access controls (RBAC) to control who can create, edit, and delete links.",
      },
      {
        title: "Team analytics",
        description:
          "See how your team is performing with team analytics, including link clicks and top referrers.",
      },
    ],
  },
];
