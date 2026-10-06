export interface DistrictStat {
  name: string;
  nameEn: string;
  orders: number;
  buildings: number;
  center: [number, number];
  bbox: [number, number, number, number];
}

export function districtSlug(nameEn: string) {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface DistrictData {
  fetchedAt: string;
  repairLastUpdate: string;
  totalOrders: number;
  totalBuildings: number;
  districts: DistrictStat[];
}

export async function fetchDistricts(
  signal: AbortSignal,
): Promise<DistrictData> {
  const response = await fetch("/api/districts", { signal });
  if (!response.ok) throw new Error("District data unavailable");
  const data = (await response.json()) as DistrictData;
  if (!Array.isArray(data.districts) || data.districts.length !== 18)
    throw new Error("Invalid district data");
  return data;
}
