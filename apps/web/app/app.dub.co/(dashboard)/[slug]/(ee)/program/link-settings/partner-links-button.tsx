"use client";

import useProgram from "@/lib/swr/use-program";
import { Button } from "@dub/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PartnerLinksButton() {
  const { slug } = useParams();
  const { program } = useProgram();
  return (
    <Link
      href={`/${slug}/links${program?.defaultFolderId ? `?folderId=${program.defaultFolderId}` : ""}`}
    >
      <Button text="View partner links" variant="secondary" />
    </Link>
  );
}
