export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ensureUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug);
    return baseSlug;
  }
  let i = 2;
  while (existingSlugs.has(`${baseSlug}-${i}`)) {
    i++;
  }
  const slug = `${baseSlug}-${i}`;
  existingSlugs.add(slug);
  return slug;
}
