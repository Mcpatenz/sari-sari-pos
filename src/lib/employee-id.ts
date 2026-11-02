/**
 * Employee ids are generated once, when the owner adds a staff member:
 * the first four letters of the family name, the hire year and month, then a
 * store-wide running count that keeps climbing with every hire.
 *
 *   "Maria Dela Cruz" hired in Oct 2026, the third hire in the store
 *   -> CRUZ20261003
 *
 * Pure string logic so both the server and the (optimistic) form can use it.
 */

/** First four letters of the family name (last word), uppercased. */
export function surnamePrefix(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const surname = parts.length > 0 ? parts[parts.length - 1] : "";
  const letters = surname.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  return letters || "USER";
}

export function employeeIdBase(name: string, at: Date): string {
  const yyyy = at.getFullYear().toString();
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  return `${surnamePrefix(name)}${yyyy}${mm}`;
}

/** Matches any id we hand out: letters, then YYYY, MM, then the sequence. */
const EMPLOYEE_ID_PATTERN = /^[A-Z]+(\d{4})(\d{2})(\d+)$/;

/**
 * The next id for this store: base + one more than the highest sequence handed
 * out so far. The sequence is store-wide, so it never repeats across surnames
 * or months (the first hire is 01, the next is 02, and so on).
 */
export function nextEmployeeId(
  existing: Array<string | null | undefined>,
  name: string,
  at: Date = new Date(),
): string {
  const base = employeeIdBase(name, at);
  let max = 0;
  for (const id of existing) {
    if (!id) continue;
    const match = EMPLOYEE_ID_PATTERN.exec(id);
    if (!match) continue;
    const n = Number(match[3]);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${base}${String(max + 1).padStart(2, "0")}`;
}
