import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.VITE_BACKEND_HTTP ?? "http://127.0.0.1:8080";

type ObsCategory = "poi" | "daily_activity" | "new_shop" | "citizen_feedback" | "local_history";

interface Observation {
  id: string;
  category: ObsCategory;
  name: string;
  description: string;
  tags: string[];
  lat: number;
  lng: number;
  _key: string; // local unique key for list rendering
}

interface AgentDraft {
  filename: string;
  rawJson: Record<string, unknown>;
  // VillageAgent fields
  agentId: string;
  name: string;
  persona: string;
  history: string;
  // observations (excludes weather)
  observations: Observation[];
}

function gv(node: Record<string, unknown>, key: string, def: unknown = ""): unknown {
  const v = node[key];
  if (v === undefined || v === null) return def;
  if (typeof v === "object" && !Array.isArray(v) && "value" in (v as Record<string, unknown>))
    return (v as Record<string, unknown>).value;
  return v;
}

function parseAgent(filename: string, raw: Record<string, unknown>): AgentDraft {
  const graph = (raw["@graph"] as Record<string, unknown>[]) ?? [];
  const va = graph.find((n) => n.type === "VillageAgent") ?? {};
  const obsNodes = graph.filter((n) => n.type === "LocalObservation" && gv(n as Record<string, unknown>, "category") !== "weather");

  const observations: Observation[] = obsNodes.map((o, i) => {
    const loc = gv(o as Record<string, unknown>, "location", {}) as Record<string, unknown>;
    const locVal = (loc.value ?? loc) as Record<string, unknown>;
    const coords = (locVal.coordinates as number[]) ?? [120.197, 22.999];
    const tagsRaw = gv(o as Record<string, unknown>, "tags", []);
    return {
      id: (o.id as string) ?? "",
      category: (gv(o as Record<string, unknown>, "category", "poi") as ObsCategory),
      name: (gv(o as Record<string, unknown>, "name", "") as string),
      description: (gv(o as Record<string, unknown>, "description", "") as string),
      tags: Array.isArray(tagsRaw) ? tagsRaw : [],
      lat: coords[1] ?? 22.999,
      lng: coords[0] ?? 120.197,
      _key: `obs-${i}-${Date.now()}`,
    };
  });

  return {
    filename,
    rawJson: raw,
    agentId: (gv(va as Record<string, unknown>, "agentId", "") as string),
    name: (gv(va as Record<string, unknown>, "name", "") as string),
    persona: (gv(va as Record<string, unknown>, "persona", "") as string),
    history: (gv(va as Record<string, unknown>, "history", "") as string),
    observations,
  };
}

function buildJson(draft: AgentDraft): Record<string, unknown> {
  const raw = draft.rawJson;
  const graph = [...((raw["@graph"] as Record<string, unknown>[]) ?? [])];

  // Update VillageAgent node
  const vaIdx = graph.findIndex((n) => n.type === "VillageAgent");
  if (vaIdx >= 0) {
    const va = { ...graph[vaIdx] } as Record<string, unknown>;
    const setField = (key: string, val: unknown) => {
      const existing = va[key];
      if (existing && typeof existing === "object" && !Array.isArray(existing) && "value" in (existing as Record<string, unknown>))
        va[key] = { ...(existing as Record<string, unknown>), value: val };
      else
        va[key] = val;
    };
    setField("agentId", draft.agentId);
    setField("name", draft.name);
    setField("persona", draft.persona);
    setField("history", draft.history);
    graph[vaIdx] = va;
  }

  // Remove existing non-weather observations, preserve weather ones
  const weatherObs = graph.filter((n) => n.type === "LocalObservation" && gv(n as Record<string, unknown>, "category") === "weather");
  const nonObs = graph.filter((n) => n.type !== "LocalObservation");

  const newObs: Record<string, unknown>[] = draft.observations.map((o, i) => ({
    "@context": (graph[0] as Record<string, unknown>)["@context"],
    id: o.id || `urn:ngsi-ld:LocalObservation:Tainan:edited-${draft.agentId}-${Date.now()}-${i}`,
    type: "LocalObservation",
    agentId: draft.agentId,
    category: o.category,
    name: o.name,
    description: o.description,
    tags: o.tags,
    location: {
      type: "GeoProperty",
      value: { type: "Point", coordinates: [o.lng, o.lat] },
    },
  }));

  return { ...raw, "@graph": [...nonObs, ...weatherObs, ...newObs] };
}

const CAT_LABELS: Record<ObsCategory, string> = {
  poi: "景點/地標",
  daily_activity: "日常活動",
  new_shop: "新店情報",
  citizen_feedback: "市民意見",
  local_history: "在地歷史",
};
const CAT_COLOR: Record<ObsCategory, string> = {
  poi: "var(--gold)",
  daily_activity: "#4ade80",
  new_shop: "#60a5fa",
  citizen_feedback: "#f87171",
  local_history: "#c084fc",
};

export function AgentEditorPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");

  useEffect(() => {
    fetch(`${BASE}/api/editor/agents`)
      .then((r) => r.json())
      .then(setFiles)
      .catch(() => setFiles([]));
  }, []);

  const loadAgent = useCallback(async (filename: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/editor/agents/${encodeURIComponent(filename)}`);
      const raw = await r.json();
      setDraft(parseAgent(filename, raw));
      setSaveStatus("idle");
    } catch {
      alert(`載入 ${filename} 失敗`);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAgent = async () => {
    if (!draft) return;
    setSaveStatus("saving");
    try {
      const body = buildJson(draft);
      const r = await fetch(`${BASE}/api/editor/agents/${encodeURIComponent(draft.filename)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e) {
      setSaveStatus("err");
      alert(`儲存失敗: ${e}`);
    }
  };

  const addObs = () => {
    if (!draft) return;
    const newObs: Observation = {
      id: "",
      category: "poi",
      name: "",
      description: "",
      tags: [],
      lat: 22.999,
      lng: 120.197,
      _key: `new-${Date.now()}`,
    };
    setDraft({ ...draft, observations: [newObs, ...draft.observations] });
  };

  const removeObs = (key: string) => {
    if (!draft) return;
    setDraft({ ...draft, observations: draft.observations.filter((o) => o._key !== key) });
  };

  const updateObs = (key: string, patch: Partial<Observation>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      observations: draft.observations.map((o) => (o._key === key ? { ...o, ...patch } : o)),
    });
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg-dark)" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: "1px solid var(--glass-border)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "var(--bg-elevated)",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--glass-border)", fontFamily: "var(--font-serif)", color: "var(--gold)", fontSize: "1rem", fontWeight: 700 }}>
          📁 Agent 列表
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {files.length === 0 && (
            <div style={{ padding: 20, color: "var(--text-dim)", fontSize: "0.85rem", textAlign: "center" }}>
              連線中…
            </div>
          )}
          {files.map((f) => (
            <button key={f} type="button" onClick={() => loadAgent(f)}
              style={{
                width: "100%", textAlign: "left", padding: "10px 16px",
                background: draft?.filename === f ? "rgba(255,215,0,0.1)" : "transparent",
                borderLeft: draft?.filename === f ? "3px solid var(--gold)" : "3px solid transparent",
                border: "none", borderBottom: "1px solid var(--glass-border)", cursor: "pointer",
                color: draft?.filename === f ? "var(--gold)" : "var(--text-secondary)",
                fontSize: "0.82rem", transition: "all 0.2s",
              }}>
              {f.replace(".json", "")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Editor ── */}
      <div style={{ flex: 1, overflow: "hidden", padding: "20px 24px", display: "flex", flexDirection: "column" }}>
        {!draft && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>⬅️</span>
            <span style={{ fontSize: "1.1rem" }}>從左側選擇一個里來編輯</span>
          </div>
        )}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--gold)" }}>載入中…</div>
        )}

        {draft && !loading && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", color: "var(--gold)", fontSize: "1.3rem", margin: 0 }}>
                🏠 {draft.name || draft.filename}
              </h2>
              <button type="button" onClick={saveAgent}
                style={{
                  padding: "8px 22px", borderRadius: "var(--r-pill)",
                  background: saveStatus === "ok" ? "#16a34a" : "var(--gold)",
                  color: "#000", fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer",
                }}>
                {saveStatus === "saving" ? "儲存中…" : saveStatus === "ok" ? "✅ 已儲存" : "💾 儲存"}
              </button>
            </div>

            {/* ── Two-column body ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>

              {/* Left: VillageAgent fields */}
              <section style={{ background: "var(--bg-elevated)", borderRadius: "var(--r-lg)", padding: "18px 20px", border: "1px solid var(--glass-border)", overflowY: "auto" }}>
                <h3 style={{ color: "var(--text-dim)", fontSize: "0.7rem", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase", margin: "0 0 14px" }}>基礎設定</h3>
                <Field label="Agent ID" value={draft.agentId} onChange={(v) => setDraft({ ...draft, agentId: v })} />
                <Field label="里名稱" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                <Field label="神明性格 (影響回答語氣)" value={draft.persona} onChange={(v) => setDraft({ ...draft, persona: v })} />
                <Field label="街區歷史概述" value={draft.history} onChange={(v) => setDraft({ ...draft, history: v })} multiline />
              </section>

              {/* Right: Observations */}
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
                  <h3 style={{ color: "var(--text-primary)", fontSize: "0.95rem", margin: 0 }}>
                    📌 在地觀察 <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: "0.8rem" }}>({draft.observations.length} 筆)</span>
                  </h3>
                  <button type="button" onClick={addObs}
                    style={{ padding: "5px 14px", borderRadius: "var(--r-pill)", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80", fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>
                    ＋ 新增
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {draft.observations.map((obs) => (
                    <ObsCard key={obs._key} obs={obs}
                      onChange={(patch) => updateObs(obs._key, patch)}
                      onRemove={() => removeObs(obs._key)}
                    />
                  ))}
                  {draft.observations.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: "0.88rem" }}>
                      尚無觀察記錄。點「＋ 新增」加入景點或活動。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const style: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)",
    background: "var(--bg-dark)", border: "1px solid var(--glass-border)",
    color: "var(--text-primary)", fontSize: "0.88rem", fontFamily: "inherit",
    boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...style, resize: "vertical" }} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={style} />
      }
    </div>
  );
}

function ObsCard({ obs, onChange, onRemove }: {
  obs: Observation;
  onChange: (patch: Partial<Observation>) => void;
  onRemove: () => void;
}) {
  const catColor = CAT_COLOR[obs.category] ?? "var(--text-secondary)";
  return (
    <div style={{
      background: "var(--bg-elevated)", border: `1px solid var(--glass-border)`,
      borderLeft: `3px solid ${catColor}`,
      borderRadius: "var(--r-lg)", padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
        <select value={obs.category}
          onChange={(e) => onChange({ category: e.target.value as ObsCategory })}
          style={{ padding: "6px 10px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: catColor, fontSize: "0.8rem", cursor: "pointer" }}>
          {(Object.keys(CAT_LABELS) as ObsCategory[]).map((c) => (
            <option key={c} value={c}>{CAT_LABELS[c]}</option>
          ))}
        </select>
        <input type="text" value={obs.name} placeholder="名稱"
          onChange={(e) => onChange({ name: e.target.value })}
          style={{ flex: 1, padding: "6px 10px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontSize: "0.88rem" }} />
        <button type="button" onClick={onRemove}
          style={{ padding: "6px 10px", borderRadius: "var(--r-md)", background: "rgba(248,113,113,0.12)", border: "1px solid #f87171", color: "#f87171", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}>
          移除
        </button>
      </div>

      <textarea value={obs.description} placeholder="描述內容…" rows={2}
        onChange={(e) => onChange({ description: e.target.value })}
        style={{ width: "100%", padding: "7px 10px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.82rem", resize: "vertical", boxSizing: "border-box", marginBottom: 8 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginBottom: 3 }}>標籤 (逗號分隔)</label>
          <input type="text" value={obs.tags.join(", ")}
            onChange={(e) => onChange({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            style={{ width: "100%", padding: "5px 10px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.8rem", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginBottom: 3 }}>緯度</label>
          <input type="number" step="0.0001" value={obs.lat}
            onChange={(e) => onChange({ lat: parseFloat(e.target.value) || obs.lat })}
            style={{ width: 110, padding: "5px 8px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.8rem" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginBottom: 3 }}>經度</label>
          <input type="number" step="0.0001" value={obs.lng}
            onChange={(e) => onChange({ lng: parseFloat(e.target.value) || obs.lng })}
            style={{ width: 110, padding: "5px 8px", borderRadius: "var(--r-md)", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.8rem" }} />
        </div>
      </div>
    </div>
  );
}
