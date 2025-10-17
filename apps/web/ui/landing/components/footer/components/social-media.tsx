import Facebook from "@/ui/shared/icons/social-media/facebook.tsx";
import Instagram from "@/ui/shared/icons/social-media/instagram.tsx";
import Link from "next/link";

const socialMediaLinks = [
  {
    href: "https://www.instagram.com/getqr_com",
    icon: Instagram,
    label: "Instagram",
  },
  {
    href: "https://www.facebook.com/GetQRcom",
    icon: Facebook,
    label: "Facebook",
  },
];

export const SocialMedia = () => (
  <div className="flex items-center gap-4">
    {socialMediaLinks.map(({ href, icon: Icon, label }) => (
      <Link
        key={label}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-70"
        aria-label={`Follow us on ${label}`}
      >
        <Icon className="size-5" />
      </Link>
    ))}
  </div>
);
