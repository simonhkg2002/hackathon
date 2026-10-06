// Public reference floor plans are keyed to the exact official building CSUID.
// These are third-party estate plans, not Buildings Department approved plans.
export const publicFloorPlans: Record<
  string,
  { source: string; pageUrl: string; imageUrl: string }
> = {
  "1432326923T20050430": {
    source: "28Hse",
    pageUrl: "https://www.28hse.com/estate/detail/sun-tuen-mun-centre-4426",
    imageUrl:
      "https://i1.28hse.com/estate_data/110/4426/FLOOR/4426_20240205105849953396_large.jpg",
  },
};
