import { UseFormReturn } from "react-hook-form";
import { QRFormData } from "../types/context";

export interface QRFormRef {
  validate: () => Promise<boolean>;
  getValues: () => QRFormData;
  form: UseFormReturn<any>;
}
