export const SEA_VIEW_BUILDING_CSUID = "1816213942T20050430";

export function isSeaViewDemoBuilding(building: { BuildingCSUID: string }) {
  return building.BuildingCSUID === SEA_VIEW_BUILDING_CSUID;
}
