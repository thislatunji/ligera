import crypto from "crypto";

export function signUpload(params: { folder?: string; timestamp?: number } = {}) {
  const folder = params.folder || "ligera";
  const timestamp = params.timestamp || Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "test-secret";
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");
  return {
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY || "test-key",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "test-cloud",
  };
}
