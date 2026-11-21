"use client";

import { useState } from "react";

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<any>({});
  
  return (
    <div>
      <h3>Email Templates</h3>
      {Object.keys(templates).length === 0 && <p>No templates configured</p>}
      <div>
        <textarea placeholder="Template content" />
        <button>Save</button>
      </div>
      <iframe title="Preview" srcDoc="<html><body>Preview</body></html>" />
    </div>
  );
}

export default EmailTemplatesTab;
