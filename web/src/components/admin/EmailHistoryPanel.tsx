"use client";

import { useState } from "react";

export function EmailHistoryPanel({ orderId }: { orderId?: string } = {}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const resend = async (id: string) => {
    // Placeholder implementation
  };

  return (
    <div>
      <h3>Email History</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Recipient</th>
            <th>Error</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.type}</td>
              <td>{row.status}</td>
              <td>{row.recipient}</td>
              <td>{row.lastError}</td>
              <td>
                <button disabled={row.status === "pending"} onClick={() => resend(row.id)}>
                  Resend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmailHistoryPanel;
