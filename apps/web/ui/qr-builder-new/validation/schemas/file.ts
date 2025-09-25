import { z } from "zod";
import { qrNameSchema } from "./base";


export const pdfQRSchema = qrNameSchema.extend({
  filesPDF: z.array(z.instanceof(File))
    .min(1, "Please select a PDF file")
    .max(1, "Please select only one PDF file")
    .refine(
      (files) => files.every(file => file.type === "application/pdf"),
      "Please select only PDF files"
    )
    .refine(
      (files) => files.every(file => file.size <= 20 * 1024 * 1024),
      "PDF file size must be less than 20MB"
    ),
});

// Image specific validation
export const imageQRSchema = qrNameSchema.extend({
  filesImage: z.array(z.instanceof(File))
    .min(1, "Please select an image file")
    .max(1, "Please select only one image file")
    .refine(
      (files) => files.every(file => file.type.startsWith("image/")),
      "Please select only image files"
    )
    .refine(
      (files) => files.every(file => file.size <= 5 * 1024 * 1024),
      "Image file size must be less than 5MB"
    ),
});

// Video specific validation
export const videoQRSchema = qrNameSchema.extend({
  filesVideo: z.array(z.instanceof(File))
    .min(1, "Please select a video file")
    .max(1, "Please select only one video file")
    .refine(
      (files) => files.every(file => file.type.startsWith("video/")),
      "Please select only video files"
    )
    .refine(
      (files) => files.every(file => file.size <= 50 * 1024 * 1024),
      "Video file size must be less than 50MB"
    ),
});

export type TPdfQRFormData = z.infer<typeof pdfQRSchema>;
export type TImageQRFormData = z.infer<typeof imageQRSchema>;
export type TVideoQRFormData = z.infer<typeof videoQRSchema>;