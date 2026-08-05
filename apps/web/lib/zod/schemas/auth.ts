import * as z from "zod/v4";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(1000, "Password must be less than 1000 characters")
  .regex(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
    "Password must contain at least one number, one uppercase, and one lowercase letter",
  );

export const emailSchema = z
  .email()
  .trim()
  .min(1)
  .transform((email) => email.toLowerCase());

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
