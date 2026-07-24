// Shared types for ERP
export type Role = 'SUPER_ADMIN' | 'COMPANY_MANAGER' | 'ORDER_BOOKER' | 'ACCOUNTS' | 'WAREHOUSE' | 'VIEWER'

export type OrderStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PICKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export type ShopClass = 'A' | 'B' | 'C'

export type TaxType = 'FILER' | 'NON_FILER'

export type PaymentMode = 'CASH' | 'CHEQUE' | 'TRANSFER' | 'ONLINE'

export interface CartItem {
  productId: string
  code: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxRate: number
  schemeApplied?: string
}

export interface OrderTotals {
  subtotal: number
  schemeDiscount: number
  manualDiscount: number
  totalDiscount: number
  taxableAmount: number
  salesTax: number
  furtherTax: number
  withholdingTax: number
  grandTotal: number
  creditLimitExceeded: boolean
  stockShortage: boolean
  warnings: string[]
}

// Calculate order totals with full tax logic
// Sales tax: on taxable amount (subtotal - discounts)
// Further tax: only for NON_FILER shops (% of sales tax value, default 3%)
// Withholding tax: filer 4.5% / non-filer 8% on grand total (after sales tax)
export function calculateOrderTotals(
  items: CartItem[],
  opts: {
    manualDiscount: number
    salesTaxRate: number
    filerTaxRate: number
    nonFilerTaxRate: number
    furtherTaxRate: number
    shopTaxType: TaxType
    creditLimit: number
    outstandingBalance: number
    currencyRate: number
  }
): OrderTotals {
  const warnings: string[] = []
  let subtotal = 0
  let schemeDiscount = 0
  let salesTax = 0
  let lineTaxable = 0

  for (const item of items) {
    const lineGross = item.quantity * item.unitPrice
    subtotal += lineGross
    const lineDiscount = (lineGross * item.discountPct) / 100
    schemeDiscount += lineDiscount
    const lineAfterDiscount = lineGross - lineDiscount
    const lineTax = (lineAfterDiscount * item.taxRate) / 100
    salesTax += lineTax
    lineTaxable += lineAfterDiscount
  }

  const manualDiscount = Math.min(opts.manualDiscount, lineTaxable)
  const totalDiscount = schemeDiscount + manualDiscount
  const taxableAmount = lineTaxable - manualDiscount

  // recompute sales tax proportionally if manual discount applied on taxable
  const salesTaxRateRatio = lineTaxable > 0 ? salesTax / lineTaxable : 0
  salesTax = taxableAmount * salesTaxRateRatio

  let furtherTax = 0
  if (opts.shopTaxType === 'NON_FILER') {
    furtherTax = (salesTax * opts.furtherTaxRate) / 100
  }

  const totalAfterSalesTax = taxableAmount + salesTax + furtherTax

  let withholdingTax = 0
  if (opts.shopTaxType === 'FILER') {
    withholdingTax = (totalAfterSalesTax * opts.filerTaxRate) / 100
  } else {
    withholdingTax = (totalAfterSalesTax * opts.nonFilerTaxRate) / 100
  }

  const grandTotal = totalAfterSalesTax + withholdingTax

  // Credit limit check (in PKR / base currency)
  const grandTotalBase = grandTotal * opts.currencyRate
  const creditLimitExceeded =
    opts.creditLimit > 0 && opts.outstandingBalance + grandTotalBase > opts.creditLimit

  if (creditLimitExceeded) {
    warnings.push(
      `⚠️ Credit limit exceeded! Outstanding: ${opts.outstandingBalance.toFixed(2)} + New: ${grandTotalBase.toFixed(2)} = ${(opts.outstandingBalance + grandTotalBase).toFixed(2)} (Limit: ${opts.creditLimit.toFixed(2)}). Order will still be saved but flagged.`
    )
  }

  return {
    subtotal,
    schemeDiscount,
    manualDiscount,
    totalDiscount,
    taxableAmount,
    salesTax,
    furtherTax,
    withholdingTax,
    grandTotal,
    creditLimitExceeded,
    stockShortage: false,
    warnings,
  }
}

export function formatCurrency(amount: number, currency = 'PKR', rate = 1): string {
  const converted = amount * rate
  const symbols: Record<string, string> = { PKR: 'Rs', USD: '$', EUR: '€', AED: 'AED', SAR: 'SR' }
  const symbol = symbols[currency] || currency
  return `${symbol} ${converted.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generateCode(prefix: string, num: number, pad = 6): string {
  return `${prefix}-${String(num).padStart(pad, '0')}`
}
