import { FC, ReactNode } from "react";

interface IGetInfoCardProps {
  title: string;
  content: string;
  img: ReactNode;
}
export const FeaturesCard: FC<IGetInfoCardProps> = ({
  title,
  content,
  img,
}) => {
  return (
    <div className="bg-primary-100 border-border-100 flex flex-col items-start justify-start gap-3 rounded-lg border p-3 shadow-sm md:gap-4 md:p-4">
      <div className="[&_svg>path]:fill-primary [&_svg>g]:stroke-primary [&_svg]:h-8 [&_svg]:w-8">
        {img}
      </div>
      <h3 className="text-neutral text-base font-semibold">{title}</h3>
      <p className="text-sm text-neutral-300">{content}</p>
    </div>
  );
};
