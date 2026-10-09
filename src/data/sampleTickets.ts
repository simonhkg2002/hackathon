import { DEMO_BUILDING_CSUID } from "../map/demoBuilding";
import type {
  DemoTicket,
  ModelPoint,
  TicketCategory,
  TicketLocation,
} from "../services/demoTickets";

// Fictional, repeatable examples. Never store or broadcast them as resident reports.
const examples: Array<{
  floor: number;
  location: TicketLocation;
  category: TicketCategory;
  description: string;
  descriptionEn: string;
  modelPoint: ModelPoint;
}> = [
  {
    floor: 3,
    location: "corridor",
    category: "obstruction",
    description: "公共走廊近樓梯口堆放紙箱及舊傢俬，通道變窄。",
    descriptionEn:
      "Boxes and discarded furniture narrow the common corridor near the stairs.",
    modelPoint: { x: 0, z: 2.1 },
  },
  {
    floor: 7,
    location: "stairs",
    category: "fire-safety",
    description: "防煙門的閉門器鬆脫，門未能自行關上。",
    descriptionEn:
      "The fire door closer is loose and the door does not close by itself.",
    modelPoint: { x: 1.3, z: 2.3 },
  },
  {
    floor: 9,
    location: "ceiling",
    category: "ceiling",
    description: "升降機大堂的公共天花批盪鬆脫，有碎屑跌落。",
    descriptionEn:
      "Loose ceiling plaster in the shared lift lobby is dropping fragments.",
    modelPoint: { x: 0, z: -2.5 },
  },
  {
    floor: 12,
    location: "ceiling",
    category: "water",
    description: "公共走廊天花有滲水及水漬，地面偶有滴水。",
    descriptionEn:
      "Water stains and occasional drips are visible below the common corridor ceiling.",
    modelPoint: { x: -1.8, z: -2.5 },
  },
  {
    floor: 18,
    location: "lift",
    category: "lift",
    description: "升降機停站時與樓面有高低差，居民容易絆倒。",
    descriptionEn:
      "The lift stops unevenly against the landing, creating a trip hazard.",
    modelPoint: { x: -1.1, z: -0.9 },
  },
  {
    floor: 21,
    location: "corridor",
    category: "electrical",
    description: "公共電錶櫃門損壞，內部線路可能外露。",
    descriptionEn:
      "The shared meter cabinet door is damaged and wiring may be exposed.",
    modelPoint: { x: -2.7, z: -2.5 },
  },
  {
    floor: 27,
    location: "facade",
    category: "facade",
    description: "外牆混凝土及飾面有剝落跡象，須由合資格人士檢查。",
    descriptionEn:
      "Exterior concrete and finish show signs of spalling and need professional inspection.",
    modelPoint: { x: 11.4, z: -1 },
  },
  {
    floor: 31,
    location: "stairs",
    category: "concrete",
    description: "公共樓梯踏級邊緣破損，防滑條部分鬆脫。",
    descriptionEn:
      "A shared stair tread edge is chipped and part of its anti-slip strip is loose.",
    modelPoint: { x: 0.8, z: 2.1 },
  },
  {
    floor: 41,
    location: "corridor",
    category: "fire-safety",
    description: "公共走廊的火警警鐘面板顯示故障，需安排檢查。",
    descriptionEn:
      "The common corridor fire alarm panel shows a fault and needs inspection.",
    modelPoint: { x: 2.5, z: -2.5 },
  },
];

export const sampleTickets: DemoTicket[] = examples.map((example, index) => ({
  ...example,
  id: `sample-${index + 1}`,
  buildingCsuid: DEMO_BUILDING_CSUID,
  status: "new",
  createdAt: "",
  sample: true,
}));
