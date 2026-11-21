import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || "test_key";
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail(command: {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const resend = getResendClient();
  const result = await resend.emails.send({
    from: command.from,
    to: command.to,
    subject: command.subject,
    html: command.html,
    replyTo: command.replyTo,
    headers: command.headers,
  } as any);
  return result;
}
