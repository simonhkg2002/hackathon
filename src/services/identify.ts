import proj4 from "proj4";
import type { Language } from "../i18n";
const HK80 =
  "+proj=tmerc +lat_0=22.3121333333333 +lon_0=114.178555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,-0.067753,2.243648,1.158828,-1.094246 +units=m +no_defs";
export const toHK80 = (longitude: number, latitude: number) =>
  proj4("EPSG:4326", HK80, [longitude, latitude]);
export interface Facility {
  id: string;
  name: string;
  address: string;
  category: string;
  details: [string, string][];
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown) =>
  typeof v === "string" ? v.replace(/<[^>]*>/g, "").trim() : "";
export function parseIdentify(
  data: unknown,
  language: Language = "zh",
): Facility[] {
  if (!object(data) || !Array.isArray(data.results))
    throw new Error(
      language === "en"
        ? "The Identify service returned an unexpected response."
        : "查詢服務回傳了無法識別的資料格式。",
    );
  const output: Facility[] = [];
  const seen = new Set<string>();
  function groups(list: unknown[], depth = 0) {
    if (depth > 5) return;
    for (const group of list) {
      if (!object(group) || !Array.isArray(group.addressInfo)) continue;
      for (const item of group.addressInfo) {
        if (!object(item)) continue;
        const name =
          (language === "en"
            ? text(item.ename) || text(item.cname)
            : text(item.cname) || text(item.ename)) ||
          (language === "en"
            ? text(item.eaddress) || text(item.caddress)
            : text(item.caddress) || text(item.eaddress)) ||
          (language === "en" ? "Unnamed facility" : "未命名設施");
        const extra = language === "en" ? item.eextrainfo : item.cextrainfo;
        const id = text(item.uniqueId) || `${name}-${item.x}-${item.y}`;
        if (!seen.has(id)) {
          seen.add(id);
          output.push({
            id,
            name,
            address:
              language === "en"
                ? text(item.eaddress) || text(item.caddress)
                : text(item.caddress) || text(item.eaddress),
            category:
              language === "en"
                ? text(group.eheader) || text(group.cheader)
                : text(group.cheader) || text(group.eheader),
            details: object(extra)
              ? (Object.entries(extra)
                  .map(([k, v]) => [k, text(v)])
                  .filter(([, v]) => v) as [string, string][])
              : [],
          });
        }
        if (Array.isArray(item.facility)) groups(item.facility, depth + 1);
      }
    }
  }
  groups(data.results);
  return output;
}
export async function identify(
  longitude: number,
  latitude: number,
  signal: AbortSignal,
  language: Language = "zh",
) {
  const [x, y] = toHK80(longitude, latitude);
  const response = await fetch(
    `/api/lands/identify?${new URLSearchParams({ x: x.toFixed(3), y: y.toFixed(3), lang: language })}`,
    { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) },
  );
  if (!response.ok)
    throw new Error(
      language === "en"
        ? `Identify is unavailable (${response.status}). Please retry later.`
        : `設施查詢暫時無法使用（${response.status}）。請稍後再試。`,
    );
  return parseIdentify(await response.json(), language);
}
