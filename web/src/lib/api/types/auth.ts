export interface AuthTokens {
  user: CurrentUser;
  accessTokenMaxAge: 900;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  twoFactorEnabled: boolean;
}

export interface TwoFactorSetup {
  otpauthUri: string;
  secret: string;
}

export interface UploadSignature {
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  uploadUrl: "https://api.cloudinary.com/v1_1/image/upload";
}

export * from "../schemas/auth";
