export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function createIpRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) {
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  return function isRateLimited(req: Request): boolean {
    if (process.env.NODE_ENV === "test") return false;
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= max) {
        return true;
      }
      entry.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    }
    return false;
  };
}
