"use client";

import Tilt from "react-parallax-tilt";
import BlurImage from "#/ui/blur-image";
import Link from "next/link";
import { ExpandingArrow } from "../icons";

export const Customer = ({ slug, site }: { slug: string; site?: string }) => (
  <Tilt
    glareEnable={true}
    glareMaxOpacity={0.3}
    glareColor="#ffffff"
    glarePosition="all"
    glareBorderRadius="16px"
    tiltMaxAngleX={16}
    tiltMaxAngleY={16}
  >
    <Link
      href={site || `/customers/${slug}`}
      {...(site ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="group flex flex-col items-center justify-center space-y-2 rounded-2xl border border-gray-300 bg-white/10 p-10 backdrop-blur-sm"
    >
      <BlurImage
        src={`/_static/clients/${slug}.svg`}
        alt={slug.toUpperCase()}
        width={520}
        height={182}
        className="h-20 grayscale transition-all group-hover:grayscale-0"
      />
      <div className="flex space-x-1">
        <p className="text-sm font-medium text-gray-500 group-hover:text-green-500">
          {site ? "Visit site" : "Read more"}
        </p>
        <ExpandingArrow className="text-gray-500 group-hover:text-green-500" />
      </div>
    </Link>
  </Tilt>
);
