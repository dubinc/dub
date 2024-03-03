import { Suspense } from "react";
import { FooterClient } from "./client";
import { StatusBadge, StatusBadgeRSC } from "./status-badge";

export function Footer() {
  return (
    <footer>
      <FooterClient>
        <Suspense
          fallback={
            <StatusBadge color="bg-gray-200" status="Loading status..." />
          }
        >
          <StatusBadgeRSC />
        </Suspense>
      </FooterClient>
    </footer>
  );
}
