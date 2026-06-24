export type TravelStyle = "文青跑咖" | "古蹟景點" | "風格小店" | "瘋狂吃美食" | "親子同遊" | "戶外踏青" | "夜貓微醺" | "網美打卡" | "廟宇祈福" | "慢活騎行" | "手作體驗" | "老字號冰品";
export type TransportMode = "walk" | "scooter" | "car" | "transit";

export interface HardConstraint { date: string; spotName: string; spotId?: string; note?: string; }

export interface UserPreferences {
  dateRange: { start: string; end: string };
  hardConstraints: HardConstraint[];
  wishlist: string[];
  travelStyles: TravelStyle[];
  transportMode: TransportMode;
}

export type AgentType = "user" | "village_chief" | "system";

export interface ChatMessage {
  id: string; agentId: string; agentName: string; agentType: AgentType;
  villageDistrict?: string; content: string; timestamp: string;
  attachedSpot?: Spot; tags?: string[]; isTyping?: boolean;
}

export interface Spot {
  id: string; name: string; district: string; village: string;
  address: string; openHours: string; description: string;
  imageUrl?: string; rating?: number; reviewCount?: number;
  walkMinutesFromPrev?: number; tags?: string[]; lat?: number; lng?: number;
  type?: "attraction" | "food" | "cafe";
}

export interface ItineraryItem {
  id: string; date: string; order: number; spot: Spot;
  transportFromPrev?: TransportMode; travelMinutes?: number;
  durationMinutes?: number; note?: string;
}

export interface DayItinerary { day?: number; date: string; items: ItineraryItem[]; }

export interface ReplacementSuggestion { spot: Spot; reason: string; tags: string[]; }

export type AppPhase = "form" | "chat" | "itinerary";

export interface WSMessage {
  type: "chat" | "itinerary_update" | "replacement_suggestions" | "agent_typing" | "agent_join";
  payload: unknown;
}

export type AppPage = "home" | "you" | "qian" | "wen" | "yuan" | "yi" | "fu";
