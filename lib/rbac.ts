export const PERMANENT_ADMIN_EMAIL = "anjaney24102@iiitnr.edu.in";

export function isPermanentAdminEmail(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === PERMANENT_ADMIN_EMAIL;
}
