const enableSessions = new Map<string, { secret: string; count: number }>();

export function startEnableSession(userId: string, secret: string) {
  enableSessions.set(userId, { secret, count: 0 });
}

export function verifyEnableCode(userId: string, code: string, verifyFn: (secret: string, code: string) => boolean): { success: boolean; ready: boolean; needsMore: boolean } {
  const session = enableSessions.get(userId);
  if (!session) {
    return { success: false, ready: false, needsMore: false };
  }
  if (verifyFn(session.secret, code)) {
    session.count++;
    if (session.count >= 3) {
      return { success: true, ready: true, needsMore: false };
    }
    return { success: true, ready: false, needsMore: true };
  }
  return { success: false, ready: false, needsMore: false };
}

export function getEnableSession(userId: string) {
  return enableSessions.get(userId);
}

export function clearEnableSession(userId: string) {
  enableSessions.delete(userId);
}
