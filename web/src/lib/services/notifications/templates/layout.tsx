import React from "react";

export function EmailLayout({ children, subject }: { children: React.ReactNode; subject?: string }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#FAF7F2", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table role="presentation" width="100%" style={{ maxWidth: "600px", backgroundColor: "#FFFFFF", borderRadius: "8px" }} cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={{ padding: "40px 40px 30px 40px", textAlign: "center" }}>
                    <div style={{ color: "#B08D57", fontSize: "32px", fontFamily: "Fraunces, Georgia, serif", fontWeight: 700 }}>
                      LIGERA
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "0 40px 40px 40px", color: "#1a1a1a", fontSize: "16px", lineHeight: "24px" }}>
                    {children}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "30px 40px 40px 40px", textAlign: "center", borderTop: "1px solid #e5e5e5", color: "#666666", fontSize: "14px", lineHeight: "20px" }}>
                    <div>Ligera</div>
                    <div>Need help? Contact us</div>
                    <div>WhatsApp: +234...</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

export default EmailLayout;
