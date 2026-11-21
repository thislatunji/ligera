import { connectDb } from "../src/lib/db/connect";
import { Settings } from "../src/lib/db/models/settings";

export async function seedSettings() {
  await connectDb();
  
  const existing = await Settings.findOne();
  if (existing) {
    return existing;
  }
  
  const settings = await Settings.create({
    store: {},
    delivery: {},
    payment: {},
    homepage: {},
    seo: {},
    emailTemplates: {},
  });
  
  return settings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSettings()
    .then(() => {
      console.log("Settings seeded");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
