export function buildCloudinaryImageUrl(publicId: string, width: number): string {
  const trimmed = publicId.trim();
  if (!trimmed) return "";

  if (/^(https?:\/\/|\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const cloudName = (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    ""
  ).trim();
  if (!cloudName) return "";

  const formattedId = /\.[a-z0-9]{2,5}$/i.test(trimmed) ? trimmed : `${trimmed}.jpg`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width}/${formattedId}`;
}
