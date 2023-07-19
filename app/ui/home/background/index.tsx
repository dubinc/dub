"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import styles from "./background.module.css";

const showBackgroundSegments = new Set([
  "metatags",
  "pricing",
  "login",
  "register",
]);

export default function Background() {
  let segment;
  try {
    segment = useSelectedLayoutSegment();
  } catch (e) {
    // this is for /welcome which is still on /pages router
  }

  return !segment || showBackgroundSegments.has(segment) ? (
    <div className={styles.main}>
      <div className={styles.content} />
    </div>
  ) : null;
}
