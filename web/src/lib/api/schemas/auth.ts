import { z } from "zod";

export const LoginRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const RequestResetRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});
export type RequestResetRequest = z.infer<typeof RequestResetRequest>;

export const ConfirmResetRequest = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});
export type ConfirmResetRequest = z.infer<typeof ConfirmResetRequest>;

export const Enable2FaRequest = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type Enable2FaRequest = z.infer<typeof Enable2FaRequest>;

export const UploadSignRequest = z.object({
  folder: z.literal("ligera").default("ligera"),
});
export type UploadSignRequest = z.infer<typeof UploadSignRequest>;
