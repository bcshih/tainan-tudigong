"""問神明 (Divination) agent — a god's reading of a 擲筊 throw.

Input message (JSON): {"god_id","question","poe_result","weather"?}
Output: DivinationReading {title, msg, sub} in the chosen god's voice.

This backs the frontend WenPage / WeatherPoe: the 擲筊 ritual and weather fetch
stay client-side, but the god's textual reading comes from a real LLM call.
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_REPO_ROOT / ".env")

from google.adk.agents import LlmAgent  # noqa: E402

from deg.schemas import DivinationReading  # noqa: E402

_MODEL = "gemini-3.1-flash-lite"

# god_id → (name, 主管領域, persona) for the 6 gods in the frontend WenPage selector.
GODS: dict[str, dict[str, str]] = {
    "tudigong": {"name": "土地公", "domain": "出行運勢、今日吉凶",
                 "persona": "慈祥的長者，台南在地味，關心旅人平安"},
    "yuelao": {"name": "月老", "domain": "姻緣、感情、桃花",
               "persona": "牽紅線的長者，溫暖促狹，談情說緣"},
    "mazu": {"name": "媽祖", "domain": "平安、出行、保佑",
             "persona": "慈悲的天上聖母，護佑眾生、語氣安定"},
    "caishen": {"name": "財神爺", "domain": "財運、投資、求財",
                "persona": "豪爽的武財神，談錢財機運、提醒守成"},
    "guandi": {"name": "關聖帝君", "domain": "事業、義氣、官司",
               "persona": "剛正的協天大帝，重義氣、談事業進退"},
    "guanyin": {"name": "文昌帝君", "domain": "學業、考試、求職",
                "persona": "儒雅的文昌星君，談學業考運、勉勵用功"},
}

# 擲筊 result → meaning, to steer the reading's tone.
_POE_MEANING = {
    "sheng": "聖筊（一正一反）＝神明應允、吉",
    "yin": "陰筊（兩正面）＝神明保留、需謹慎",
    "xiao": "笑筊（兩反面）＝神明發笑、時機未到或需調整",
}


def build_divination_prompt(
    god_id: str, question: str, poe_result: str, weather: str | None = None
) -> str:
    god = GODS.get(god_id, GODS["tudigong"])
    poe = _POE_MEANING.get(poe_result, _POE_MEANING["yin"])
    weather_line = f"\n【今日台南天氣】{weather}" if weather else ""
    return (
        f"你現在是「{god['name']}」（主管：{god['domain']}）。\n"
        f"性格：{god['persona']}。\n\n"
        f"信眾誠心擲筊請示，問：「{question or '請神明指點'}」\n"
        f"擲筊結果：{poe}{weather_line}\n\n"
        f"請以「{god['name']}」的口吻給出一則籤解（繁體中文）。回傳 DivinationReading JSON：\n"
        f"- title：簡短籤題，格式如「聖筊・○○○○」，呼應擲筊結果與所問領域\n"
        f"- msg：1～2 句神明口吻的籤解，貼合所問與擲筊結果\n"
        f"- sub：一句更短的提示語\n"
        f"切忌空泛，要扣住信眾的問題與{god['name']}的領域。"
    )


def create_divination_agent() -> LlmAgent:
    """A single-shot god agent that returns a DivinationReading."""
    return LlmAgent(
        name="divination_god",
        model=_MODEL,
        description="問神明：依神明 persona 與擲筊結果，給出一則籤解。",
        instruction=(
            "你會扮演使用者訊息中指定的神明，依其口吻與領域回應擲筊請示，"
            "務必回傳合法的 DivinationReading JSON。"
        ),
        output_schema=DivinationReading,
    )


root_agent = create_divination_agent()
