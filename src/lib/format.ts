import { isMeasured, type ProductKind } from "./pricing";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPHP(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return pesoFormatter.format(safe / 100);
}

export function formatQuantity(kind: ProductKind, quantityBase: number): string {
  if (kind === "PIECE") {
    return `${quantityBase.toLocaleString("en-PH")} ${
      quantityBase === 1 ? "piece" : "pieces"
    }`;
  }

  if (quantityBase >= 1000) {
    const amount = quantityBase / 1000;
    const unit = kind === "VOLUME" ? "L" : "kg";
    return `${amount.toLocaleString("en-PH", {
      maximumFractionDigits: 3,
    })} ${unit}`;
  }

  const unit = kind === "VOLUME" ? "mL" : "g";
  return `${quantityBase.toLocaleString("en-PH")} ${unit}`;
}

export function readingForQuantity(kind: ProductKind, quantityBase: number) {
  const info = isMeasured(kind)
    ? quantityBase >= 1000
      ? { amount: quantityBase / 1000, word: kind === "VOLUME" ? "liters" : "kilograms" }
      : { amount: quantityBase, word: kind === "VOLUME" ? "milliliters" : "grams" }
    : { amount: quantityBase, word: quantityBase === 1 ? "piece" : "pieces" };
  return `${info.amount.toLocaleString("en-PH", {
    maximumFractionDigits: 3,
  })} ${info.word}`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function pesoInputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [pesos, fraction = ""] = trimmed.split(".");
  const cents = Number(pesos) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
