export type ProductKind = "PIECE" | "WEIGHT" | "VOLUME";

export type SellingUnit = {
  id: string;
  label: string;
  quantityBase: number;
  priceCents: number | null;
};

export type PriceableProduct = {
  kind: ProductKind;
  basePriceCents: number;
  units: SellingUnit[];
};

const MAX_PIECE_QUANTITY_FOR_DP = 20_000;

export function isMeasured(kind: ProductKind): boolean {
  return kind === "WEIGHT" || kind === "VOLUME";
}

export function baseUnitInfo(kind: ProductKind) {
  switch (kind) {
    case "WEIGHT":
      return { unit: "g", kiloUnit: "kg", pricePer: "per kilogram", preset: "kg" };
    case "VOLUME":
      return { unit: "mL", kiloUnit: "L", pricePer: "per liter", preset: "L" };
    default:
      return { unit: "pc", kiloUnit: "pc", pricePer: "per piece", preset: "pc" };
  }
}

function validBundleUnits(product: PriceableProduct) {
  return product.units.filter(
    (unit) =>
      Number.isSafeInteger(unit.quantityBase) &&
      unit.quantityBase > 0 &&
      unit.priceCents !== null &&
      Number.isSafeInteger(unit.priceCents) &&
      unit.priceCents >= 0,
  );
}

/**
 * Price for an arbitrary quantity measured in base units.
 * - PIECE: cheapest combination of single pieces and bundles (dynamic programming).
 * - WEIGHT/VOLUME: linear per kilogram/liter, with an exact-match override for
 *   sacks, cases and similar packaged amounts.
 */
export function priceForQuantity(
  product: PriceableProduct,
  quantityBase: number,
): number {
  if (!Number.isSafeInteger(quantityBase) || quantityBase <= 0) {
    return 0;
  }

  if (isMeasured(product.kind)) {
    const exact = product.units.find(
      (unit) => unit.quantityBase === quantityBase && unit.priceCents !== null,
    );
    if (exact && exact.priceCents !== null) {
      return exact.priceCents;
    }
    return Math.round((quantityBase * product.basePriceCents) / 1000);
  }

  if (quantityBase > MAX_PIECE_QUANTITY_FOR_DP) {
    let best = product.basePriceCents;
    for (const unit of validBundleUnits(product)) {
      const ratio = (unit.priceCents as number) / unit.quantityBase;
      if (ratio < best) best = ratio;
    }
    return Math.round(quantityBase * best);
  }

  const bundles = validBundleUnits(product);
  const dp = new Array<number>(quantityBase + 1).fill(Number.POSITIVE_INFINITY);
  dp[0] = 0;

  for (let q = 1; q <= quantityBase; q += 1) {
    dp[q] = dp[q - 1] + product.basePriceCents;
    for (const unit of bundles) {
      if (q >= unit.quantityBase) {
        const candidate = dp[q - unit.quantityBase] + (unit.priceCents as number);
        if (candidate < dp[q]) dp[q] = candidate;
      }
    }
  }

  return dp[quantityBase];
}

/**
 * Open price: how much product is a given amount worth?
 * Only meaningful for measured items. Returns a quantity in base units.
 */
export function openPriceToQuantity(
  product: PriceableProduct,
  priceCents: number,
): number {
  if (!isMeasured(product.kind) || product.basePriceCents <= 0) return 0;
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) return 0;
  return Math.max(1, Math.round((priceCents * 1000) / product.basePriceCents));
}
