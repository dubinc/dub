"use client";

import { HelpCenterCardComponent } from "./elements/help-center-card";

import { cn } from "@dub/utils/src";
import { FC, useState } from "react";
import { ISection } from "../../types";

export interface IHelpCenterCardsComponentProps {
  data: ISection[];
}

export const HelpCenterCardsComponent: FC<
  Readonly<IHelpCenterCardsComponentProps>
> = ({ data }) => {
  const [isVisibleAll, setIsVisibleAll] = useState(false);

  return (
    <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
      {data?.map((section, index) => (
        <HelpCenterCardComponent
          key={section.title}
          section={section}
          className={cn({ "col-span-full": index === 0 })}
          index={index}
          setIsVisibleAll={setIsVisibleAll}
          isVisibleAll={isVisibleAll}
        />
      ))}
    </div>
  );
};
