export type PricingConfig = {
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number | null;
  taxMode: "none" | "inclusive" | "exclusive";
  taxRateBps: number;
};
export type OrderPricing = { subtotalPaise: number; shippingPaise: number; taxPaise: number; totalPaise: number; taxIncluded: boolean };

export function getPricingConfig(): PricingConfig | null {
  const shipping = process.env.SHIPPING_FLAT_RATE_PAISE;
  const mode = process.env.TAX_MODE;
  const taxRate = process.env.GST_RATE_BPS;
  const threshold = process.env.FREE_SHIPPING_THRESHOLD_PAISE;
  const shippingFlatPaise = shipping === undefined || shipping === "" ? Number.NaN : Number(shipping);
  const taxRateBps = taxRate === undefined || taxRate === "" ? Number.NaN : Number(taxRate);
  const freeShippingThresholdPaise = threshold ? Number(threshold) : null;
  if (!Number.isSafeInteger(shippingFlatPaise) || shippingFlatPaise < 0 || !["none", "inclusive", "exclusive"].includes(mode ?? "") ||
    !Number.isSafeInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000 ||
    (freeShippingThresholdPaise !== null && (!Number.isSafeInteger(freeShippingThresholdPaise) || freeShippingThresholdPaise < 1))) return null;
  return { shippingFlatPaise, freeShippingThresholdPaise, taxMode: mode as PricingConfig["taxMode"], taxRateBps };
}

export function calculateOrderPricing(subtotalPaise: number, config: PricingConfig): OrderPricing {
  const shippingPaise = config.freeShippingThresholdPaise !== null && subtotalPaise >= config.freeShippingThresholdPaise ? 0 : config.shippingFlatPaise;
  const taxIncluded = config.taxMode === "inclusive";
  const taxPaise = config.taxMode === "none" ? 0 : config.taxMode === "inclusive"
    ? Math.round(subtotalPaise * config.taxRateBps / (10000 + config.taxRateBps))
    : Math.round(subtotalPaise * config.taxRateBps / 10000);
  return { subtotalPaise, shippingPaise, taxPaise, totalPaise: subtotalPaise + shippingPaise + (taxIncluded ? 0 : taxPaise), taxIncluded };
}
