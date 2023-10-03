"use client";

import Tweet from "#/ui/tweet";
import { useRef, useState } from "react";
import { Tweet as TweetProps } from "react-tweet/api";

export default function TestimonialsMobile({
  tweetsData,
}: {
  tweetsData: TweetProps[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col justify-center space-y-4 pt-8 sm:hidden">
      <div ref={ref} className="space-y-6">
        {tweetsData.slice(0, expanded ? undefined : 4).map((tweet, idx) => (
          <Tweet key={idx} data={tweet} />
        ))}
      </div>
      {!expanded && (
        <button
          className="mx-5 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium shadow-sm"
          onClick={() => setExpanded(true)}
        >
          Show More
        </button>
      )}
      {expanded && (
        <button
          className="sticky inset-x-0 bottom-4 mx-5 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium shadow-sm"
          onClick={() => setExpanded(false)}
        >
          Show Less
        </button>
      )}
    </div>
  );
}
