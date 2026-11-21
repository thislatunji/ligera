import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Received",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomRequestThanksPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-display text-4xl">Thank you</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Your custom order request has been received.
      </p>
    </main>
  );
}
