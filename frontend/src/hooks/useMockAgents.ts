import { useEffect } from "react";
import { useAppStore } from "../store/appStore";
import type { Spot } from "../types";

const SPOTS: Spot[] = [
  { id:"anping-castle", name:"安平古堡", district:"安平區", lat:22.9929, lng:120.1617, openHours:"08:30-17:30", tags:["古蹟","親子"], rating:4.6, description:"台灣最古老城堡，荷蘭時期建造", images:["/spots/spot1.jpg"] },
  { id:"shennong-st",   name:"神農街",   district:"中西區", lat:22.9940, lng:120.1950, openHours:"全天（夜晚最美）", tags:["文青","老街"], rating:4.7, description:"百年老屋咖啡廳林立的文創街道", images:["/spots/spot2.jpg"] },
  { id:"chihkan-tower", name:"赤崁樓",   district:"中西區", lat:22.9972, lng:120.2028, openHours:"08:30-21:30", tags:["古蹟","必去"], rating:4.8, description:"荷蘭時期建造，台南最具代表性古蹟", images:["/spots/spot3.jpg"] },
  { id:"anping-treehouse", name:"安平樹屋", district:"安平區", lat:22.9938, lng:120.1632, openHours:"08:30-17:30", tags:["自然","特景"], rating:4.5, description:"百年榕樹與廢棄倉庫融合的奇景", images:["/spots/spot4.webp"] },
  { id:"flower-night-market", name:"花園夜市", district:"北區", lat:23.0230, lng:120.2180, openHours:"週四六日 18:00-01:00", tags:["美食","夜市"], rating:4.6, description:"台南最大夜市，小吃種類多元", images:["/spots/spot5.jpg"] },
  { id:"hayashi-dept", name:"林百貨", district:"中西區", lat:22.9908, lng:120.2038, openHours:"11:00-22:00", tags:["歷史","逛街"], rating:4.5, description:"台灣第一部電梯，日治時期百貨", images:["/spots/spot6.jpg"] },
];

// 競爭感十足的里長台詞
const AGENT_SCRIPTS = [
  {
    id: "anping_chief", name: "安平里長", village: "安平區·安平里", color: "#8b244a",
    lines: [
      "我來我來！安平這裡一定要排！",
      "安平古堡 + 樹屋 + 老街，三連發！保證你來了不想走！",
      "阿我說真的，安平的夕陽是台南最美的，不來後悔！",
    ],
    spot: SPOTS[0],
  },
  {
    id: "shennong_chief", name: "神農里長", village: "中西區·神農里", color: "#37516c",
    lines: [
      "等一下！中西區才是台南的心臟！",
      "神農街的老屋咖啡、海安路的藝術彩繪，文青必訪！",
      "拜託，來台南不走神農街等於沒來過台南！",
    ],
    spot: SPOTS[1],
  },
  {
    id: "zhongzhou_chief", name: "中洲里長", village: "仁德區·中洲里", color: "#9c8ca6",
    lines: [
      "哎，你們都忘了赤崁樓！",
      "赤崁樓、孔廟、武廟走路就到，歷史文化一次滿足！",
      "台南的靈魂在古蹟，不是只有咖啡廳啦！",
    ],
    spot: SPOTS[2],
  },
];

export function useMockAgents(active: boolean) {
  const { addMessage, setTypingAgent, realIntent } = useAppStore();

  useEffect(() => {
    // 有真實後端連線就不跑假 agent
    if (!active || realIntent) return;
    if (sessionStorage.getItem("mock_agents_started")) return;
    sessionStorage.setItem("mock_agents_started", "1");

    const schedule = [
      // 第一波：里長搶著自我介紹
      { delay: 1200, agentIdx: 0, lineIdx: 0 },
      { delay: 2400, agentIdx: 1, lineIdx: 0 },
      { delay: 3200, agentIdx: 2, lineIdx: 0 },
      // 第二波：各自推薦景點
      { delay: 4500, agentIdx: 0, lineIdx: 1, withSpot: true },
      { delay: 6500, agentIdx: 1, lineIdx: 1, withSpot: true },
      { delay: 8000, agentIdx: 2, lineIdx: 1, withSpot: true },
      // 第三波：繼續搶
      { delay: 10000, agentIdx: 0, lineIdx: 2 },
      { delay: 11500, agentIdx: 1, lineIdx: 2 },
      { delay: 13000, agentIdx: 2, lineIdx: 2 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    schedule.forEach(({ delay, agentIdx, lineIdx, withSpot }) => {
      const agent = AGENT_SCRIPTS[agentIdx];

      // typing indicator
      const t1 = setTimeout(() => setTypingAgent(agent.id), delay);
      // message
      const t2 = setTimeout(() => {
        setTypingAgent(null);
        addMessage({
          id: `mock-${agent.id}-${lineIdx}-${Date.now()}`,
          agentId: agent.id,
          agentName: agent.name,
          agentType: "village_chief",
          villageDistrict: agent.village,
          content: agent.lines[lineIdx],
          timestamp: new Date().toISOString(),
          ...(withSpot ? { attachedSpot: agent.spot } : {}),
        });
      }, delay + 900);

      timers.push(t1, t2);
    });

    return () => timers.forEach(clearTimeout);
  }, [active, realIntent]);
}
