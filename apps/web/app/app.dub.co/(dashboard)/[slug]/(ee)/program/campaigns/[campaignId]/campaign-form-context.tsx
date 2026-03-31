import { UpdateCampaignFormData } from "@/lib/types";
import { useFormContext } from "react-hook-form";

export const useCampaignFormContext = () =>
  useFormContext<UpdateCampaignFormData>();
