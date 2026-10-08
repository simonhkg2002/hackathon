import { DEMO_BUILDING_CSUID } from "../map/demoBuilding";

export type TicketLocation =
  "unit" | "corridor" | "lift" | "stairs" | "wet-area" | "ceiling";
export type TicketCategory =
  "ceiling" | "water" | "electrical" | "concrete" | "door" | "other";
export type ModelPoint = { x: number; z: number };
export type DemoTicket = {
  id: string;
  buildingCsuid: string;
  floor: number;
  location: TicketLocation;
  category: TicketCategory;
  description: string;
  modelPoint: ModelPoint | null;
  status: "new";
  createdAt: string;
};

export const ticketLocations: TicketLocation[] = [
  "unit",
  "corridor",
  "lift",
  "stairs",
  "wet-area",
  "ceiling",
];
export const ticketCategories: TicketCategory[] = [
  "ceiling",
  "water",
  "electrical",
  "concrete",
  "door",
  "other",
];

const endpoint = "/api/demo-tickets";
export async function fetchDemoTickets(
  signal?: AbortSignal,
): Promise<DemoTicket[]> {
  const response = await fetch(endpoint, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Tickets unavailable");
  const data = await response.json();
  if (
    data.buildingCsuid !== DEMO_BUILDING_CSUID ||
    !Array.isArray(data.tickets)
  )
    throw new Error("Invalid ticket response");
  return data.tickets;
}

export async function submitDemoTicket(
  input: Pick<
    DemoTicket,
    "floor" | "location" | "category" | "description" | "modelPoint"
  >,
): Promise<DemoTicket> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, buildingCsuid: DEMO_BUILDING_CSUID }),
  });
  if (!response.ok) throw new Error("Ticket submission failed");
  return response.json();
}

export function subscribeDemoTickets(
  onTickets: (tickets: DemoTicket[]) => void,
  onLive: (live: boolean) => void,
) {
  const events = new EventSource(`${endpoint}/events`);
  events.onopen = () => onLive(true);
  events.onerror = () => onLive(false);
  events.addEventListener("tickets", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data);
      if (
        data.buildingCsuid === DEMO_BUILDING_CSUID &&
        Array.isArray(data.tickets)
      )
        onTickets(data.tickets);
    } catch {
      /* Ignore malformed stream events. */
    }
  });
  return () => events.close();
}
