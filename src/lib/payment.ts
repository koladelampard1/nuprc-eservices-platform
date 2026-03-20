import { PaymentStatus, type Prisma } from "@prisma/client";

export function isPaymentRequired(baseFeeNgn: Prisma.Decimal | number) {
  const amount = typeof baseFeeNgn === "number" ? baseFeeNgn : baseFeeNgn.toNumber();
  return amount > 0;
}

export function getPaymentStatusTone(status: PaymentStatus): "default" | "success" | "warning" | "danger" {
  if (status === PaymentStatus.PAID) return "success";
  if (status === PaymentStatus.PENDING) return "warning";
  if (status === PaymentStatus.FAILED || status === PaymentStatus.REVERSED) return "danger";
  return "default";
}

export function formatNaira(amount: Prisma.Decimal | number) {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function deriveGeneratedAtFromReference(referenceNo: string) {
  const match = referenceNo.match(/NUPRC-PAY-(\d{4})(\d{2})(\d{2})-\d{4}/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
