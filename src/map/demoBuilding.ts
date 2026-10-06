export const DEMO_BUILDING_CSUID = "1432326923T20050430";
export const DEMO_BUILDING_CENTER: [number, number] = [113.963803, 22.38141];

export function isDemoBuilding(building: { BuildingCSUID: string }) {
  return building.BuildingCSUID === DEMO_BUILDING_CSUID;
}
