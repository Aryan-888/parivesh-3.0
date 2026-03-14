export const PERMANENT_ADMIN_EMAIL = "admin@admin.com";
export const LEGACY_ADMIN_EMAILS = [
  "anjaney24102@iiitnr.edu.in",
  "anjaney@24102@iiitnr.edu.in",
];

export function isPermanentAdminEmail(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === PERMANENT_ADMIN_EMAIL;
}

export function isLegacyAdminEmail(email?: string | null): boolean {
  return LEGACY_ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
}
