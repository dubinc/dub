import { SVGProps } from "react";

export function DiamondTurnRight({
  variant = "outline",
  ...props
}: SVGProps<SVGSVGElement> & { variant?: "outline" | "fill" }) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        {variant === "fill" ? (
          <>
            <path
              d="M16.116,7.056L10.944,1.884c-1.038-1.039-2.851-1.039-3.889,0L1.884,7.056c-.52,.519-.806,1.21-.806,1.944s.286,1.425,.806,1.944l5.171,5.171c.519,.52,1.209,.806,1.944,.806s1.425-.286,1.944-.806l5.171-5.171c.52-.519,.806-1.209,.806-1.944s-.286-1.425-.806-1.944Zm-3.335,2.225l-2.25,2.25c-.146,.146-.338,.22-.53,.22s-.384-.073-.53-.22c-.293-.293-.293-.768,0-1.061l.97-.97h-1.689c-.689,0-1.25,.561-1.25,1.25v.5c0,.414-.336,.75-.75,.75s-.75-.336-.75-.75v-.5c0-1.517,1.233-2.75,2.75-2.75h1.689l-.97-.97c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0l2.25,2.25c.293,.293,.293,.768,0,1.061Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <polyline
              fill="none"
              points="10 6.5 12.25 8.75 10 11"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M12.25,8.75h-3.5c-1.105,0-2,.895-2,2v.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <rect
              height="11.313"
              width="11.313"
              fill="none"
              rx="2"
              ry="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              transform="translate(21.728 9) rotate(135)"
              x="3.343"
              y="3.343"
            />
          </>
        )}
      </g>
    </svg>
  );
}
