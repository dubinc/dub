import { SVGProps } from "react";

export function BadgeCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <path
          d="M16.25,9c0-1.07-.675-1.975-1.619-2.332,.415-.92,.252-2.038-.504-2.794s-1.874-.92-2.794-.504c-.357-.945-1.263-1.619-2.332-1.619s-1.975,.675-2.332,1.619c-.92-.416-2.038-.252-2.794,.504s-.919,1.874-.504,2.794c-.945,.357-1.619,1.263-1.619,2.332s.675,1.975,1.619,2.332c-.415,.92-.252,2.038,.504,2.794s1.874,.92,2.794,.504c.357,.945,1.263,1.619,2.332,1.619s1.975-.675,2.332-1.619c.92,.415,2.038,.252,2.794-.504s.92-1.874,.504-2.794c.945-.357,1.619-1.263,1.619-2.332Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="5.75 9.25 8 11.75 12.25 6.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
