const deniedJtis = new Set<string>();
const maxSize = 10000;

export function denyJti(jti: string) {
  deniedJtis.add(jti);
  // Simple LRU-ish behavior by size limit
  if (deniedJtis.size > maxSize) {
    // Remove oldest entries by converting to array and slicing
    const arr = Array.from(deniedJtis);
    deniedJtis.clear();
    // Keep the most recent ones (last half)
    for (let i = Math.floor(arr.length / 2); i < arr.length; i++) {
      deniedJtis.add(arr[i]);
    }
    deniedJtis.add(jti);
  }
}

export function isJtiDenied(jti: string): boolean {
  return deniedJtis.has(jti);
}
