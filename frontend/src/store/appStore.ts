import { create } from "zustand";
import type { AppPage, AppPhase, ChatMessage, DayItinerary, ItineraryItem, ReplacementSuggestion, TransportMode, UserPreferences } from "../types";

interface PendingMsg {
  agentId: string; agentName: string; villageDistrict: string;
  content: string; attachedSpot: any;
}
interface AppState {
  page: AppPage;
  phase: AppPhase;
  realIntent: { text: string; lat: number; lng: number } | null;
  pendingAgentMessages: PendingMsg[];
  preferences: UserPreferences|null;
  messages: ChatMessage[];
  itinerary: DayItinerary[];
  transportMode: TransportMode;
  activeReplacements:{itemId:string;suggestions:ReplacementSuggestion[]}|null;
  wsStatus:"disconnected"|"connecting"|"connected";
  sendToWS: ((payload: object) => void) | null;
  setPage:(page:AppPage)=>void;
  setRealIntent:(intent:{ text: string; lat: number; lng: number } | null)=>void;
  setPendingAgentMessages:(msgs: PendingMsg[])=>void;
  shiftPendingAgentMessage:()=>PendingMsg|null;
  setPhase:(phase:AppPhase)=>void;
  setPreferences:(prefs:UserPreferences)=>void;
  addMessage:(msg:ChatMessage)=>void;
  setTypingAgent:(agentId:string|null)=>void;
  setItinerary:(itinerary:DayItinerary[])=>void;
  removeItineraryItem:(itemId:string)=>void;
  replaceItineraryItem:(itemId:string,newItem:ItineraryItem)=>void;
  setActiveReplacements:(data:{itemId:string;suggestions:ReplacementSuggestion[]}|null)=>void;
  setWsStatus:(status:"disconnected"|"connecting"|"connected")=>void;
  setTransportMode:(mode:TransportMode)=>void;
  setSendToWS:(fn:(payload:object)=>void)=>void;
  resetChat:()=>void;
}

export const useAppStore = create<AppState>((set)=>({
  page:"home", phase:"form", preferences:null, messages:[], itinerary:[], realIntent:null, pendingAgentMessages:[],
  activeReplacements:null, wsStatus:"disconnected", transportMode:"scooter", sendToWS:null,

  setPage:(page)=>set({page}),
  setRealIntent:(realIntent)=>set({realIntent}),
  setPendingAgentMessages:(pendingAgentMessages)=>set({pendingAgentMessages}),
  shiftPendingAgentMessage:()=>{
    const state = useAppStore.getState();
    if (state.pendingAgentMessages.length === 0) return null;
    const [first, ...rest] = state.pendingAgentMessages;
    useAppStore.setState({pendingAgentMessages: rest});
    return first;
  },
  setPhase:(phase)=>set({phase}),
  setPreferences:(preferences)=>set({preferences}),
  setTransportMode:(transportMode)=>set({transportMode}),
  setSendToWS:(fn)=>set({sendToWS:fn}),
  resetChat:()=>set({messages:[],itinerary:[],wsStatus:"disconnected",phase:"form",realIntent:null,pendingAgentMessages:[],sendToWS:null}),

  addMessage:(msg)=>set((state)=>({
    messages:state.messages.filter((m)=>m.id!==`typing-${msg.agentId}`).concat(msg),
  })),

  setTypingAgent:(agentId)=>set((state)=>{
    if(!agentId) return {messages:state.messages.filter((m)=>!m.isTyping)};
    const typingMsg:ChatMessage={
      id:`typing-${agentId}`,agentId,agentName:"",agentType:"village_chief",
      content:"...",timestamp:new Date().toISOString(),isTyping:true,
    };
    return {messages:[...state.messages.filter((m)=>!m.isTyping),typingMsg]};
  }),

  setItinerary:(itinerary)=>set({itinerary}),
  removeItineraryItem:(itemId)=>set((state)=>({
    itinerary:state.itinerary.map((day)=>({...day,items:day.items.filter((item)=>item.id!==itemId)})),
  })),
  replaceItineraryItem:(itemId,newItem)=>set((state)=>({
    itinerary:state.itinerary.map((day)=>({...day,items:day.items.map((item)=>item.id===itemId?newItem:item)})),
    activeReplacements:null,
  })),
  setActiveReplacements:(data)=>set({activeReplacements:data}),
  setWsStatus:(wsStatus)=>set({wsStatus}),
}));
