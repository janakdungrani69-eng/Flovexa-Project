export type PricingConfig = {
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number | null;
  taxMode: "none" | "inclusive" | "exclusive";
  taxRateBps: number;
};
export type OrderPricing = {
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  taxIncluded: boolean;
};

export function getPricingConfig(): PricingConfig {
  const shipping = process.env.SHIPPING_FLAT_RATE_PAISE;
  const mode = process.env.TAX_MODE;
  const taxRate = process.env.GST_RATE_BPS;
  const threshold = process.env.FREE_SHIPPING_THRESHOLD_PAISE;

  // Defaults for luxury fragrances in India:
  // - Complimentary shipping (0 paise)
  // - 18% GST (1800 bps) inclusive in price
  let shippingFlatPaise = 0;
  if (shipping !== undefined && shipping !== "") {
    const val = Number(shipping);
    if (Number.isSafeInteger(val) && val >= 0) shippingFlatPaise = val;
  }

  let taxMode: PricingConfig["taxMode"] = "inclusive";
  if (mode && ["none", "inclusive", "exclusive"].includes(mode)) {
    taxMode = mode as PricingConfig["taxMode"];
  }

  let taxRateBps = 1800; // 18% GST default
  if (taxRate !== undefined && taxRate !== "") {
    const val = Number(taxRate);
    if (Number.isSafeInteger(val) && val >= 0 && val <= 10000) taxRateBps = val;
  }

  let freeShippingThresholdPaise: number | null = 0;
  if (threshold !== undefined && threshold !== "") {
    const val = Number(threshold);
    if (Number.isSafeInteger(val) && val >= 0) freeShippingThresholdPaise = val;
  }

  return { shippingFlatPaise, freeShippingThresholdPaise, taxMode, taxRateBps };
}

export function calculateOrderPricing(subtotalPaise: number, config: PricingConfig): OrderPricing {
  const shippingPaise =
    config.freeShippingThresholdPaise !== null && subtotalPaise >= config.freeShippingThresholdPaise
      ? 0
      : config.shippingFlatPaise;
  const taxIncluded = config.taxMode === "inclusive";
  const taxPaise =
    config.taxMode === "none"
      ? 0
      : config.taxMode === "inclusive"
      ? Math.round((subtotalPaise * config.taxRateBps) / (10000 + config.taxRateBps))
      : Math.round((subtotalPaise * config.taxRateBps) / 10000);
  return {
    subtotalPaise,
    shippingPaise,
    taxPaise,
    totalPaise: subtotalPaise + shippingPaise + (taxIncluded ? 0 : taxPaise),
    taxIncluded,
  };
}
