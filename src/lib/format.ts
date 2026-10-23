export const currency = (value: number) =>
  new Intl.NumberFormat("en-IT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function expandScientificInteger(value: string): string {
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  if (!match) return value.trim();
  const [, sign, whole, fraction = "", exponentText] = match;
  const digits = `${whole}${fraction}`;
  const decimalPosition = whole.length + Number(exponentText);
  if (!Number.isInteger(decimalPosition) || decimalPosition < 0 || decimalPosition > 20) return value.trim();
  const expanded = decimalPosition >= digits.length
    ? digits.padEnd(decimalPosition, "0")
    : `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
  const integer = expanded.split(".")[0].replace(/^0+(?=\d)/, "");
  return `${sign}${integer}`;
}

export function phoneNumberDigits(value: string | null | undefined): string {
  const digits = expandScientificInteger(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0039") && digits.length === 14) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) return `39${digits}`;
  return digits;
}

export function formatPhoneNumber(value: string | null | undefined): string {
  const raw = expandScientificInteger(value ?? "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return value?.trim() || "—";

  const hasItalianPrefix = digits.startsWith("39") && digits.length === 12;
  const localNumber = hasItalianPrefix ? digits.slice(2) : digits.length === 14 && digits.startsWith("0039")
    ? digits.slice(4)
    : digits;
  if (localNumber.length === 10) {
    const formatted = `${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
    return hasItalianPrefix || (digits.startsWith("0039") && digits.length === 14) ? `+39 ${formatted}` : formatted;
  }
  return raw;
}

export function csvToRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

export const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
