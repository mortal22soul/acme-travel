const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dates = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const formatMoney = (value: number | string) => dollars.format(Number(value));
export const formatDate = (value: string) => dates.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function tripImage(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return;
    if (url.hostname === "images.pexels.com" && url.pathname.startsWith("/photos/")) return value;
    if (url.hostname === "images.unsplash.com" && /^\/photo-[^/]+$/.test(url.pathname)) return value;
  } catch {
    return;
  }
}

export function routeId(value: string) {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}
