// Philippine peso formatter (Butuan City localization)
export const formatPHP = (n: number | string) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(n) || 0);
