import requests
import json
import os
from datetime import datetime

TOKEN = os.environ.get("NOTION_TOKEN")
if not TOKEN:
    raise ValueError("NOTION_TOKEN が設定されていません")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

DB_IDS = {
    "cases": "34a19575-cf10-81d3-bb84-eb69f1688402",
    "tasks": "34a19575-cf10-814d-93ad-f94700ad851e"
}

BUSINESS_AXES = [
    {"name": "スライド資料作成代行", "status": "稼働中", "note": "無料モニター案件進行中"},
    {"name": "福祉バックオフィス代行", "status": "ステイ中", "note": "再始動タイミング未定"},
    {"name": "AI活用コンサル・Claude構築代行", "status": "準備中", "note": "6〜8月始動予定"}
]

def query_db(db_id):
    results = []
    cursor = None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = requests.post(f"https://api.notion.com/v1/databases/{db_id}/query", headers=HEADERS, json=body)
        r.raise_for_status()
        data = r.json()
        results.extend(data["results"])
        if not data.get("has_more"):
            break
        cursor = data["next_cursor"]
    return results

def get_text(prop):
    if not prop:
        return ""
    if prop["type"] == "title":
        items = prop.get("title", [])
    elif prop["type"] == "rich_text":
        items = prop.get("rich_text", [])
    else:
        return ""
    return "".join(t.get("plain_text", "") for t in items)

def get_select(prop):
    if not prop or prop["type"] != "select":
        return ""
    sel = prop.get("select")
    return sel["name"] if sel else ""

def get_multi_select(prop):
    if not prop or prop["type"] != "multi_select":
        return []
    return [s["name"] for s in prop.get("multi_select", [])]

def get_number(prop):
    if not prop or prop["type"] != "number":
        return 0
    return prop.get("number") or 0

def get_date(prop):
    if not prop or prop["type"] != "date":
        return ""
    d = prop.get("date")
    return d["start"] if d else ""

def get_relation_ids(prop):
    if not prop or prop["type"] != "relation":
        return []
    return [r["id"] for r in prop.get("relation", [])]

def parse_cases(rows):
    cases = []
    for row in rows:
        p = row["properties"]
        cases.append({
            "id": row["id"],
            "name": get_text(p.get("案件名")),
            "type": get_select(p.get("事業種別")),
            "status": get_select(p.get("ステータス")),
            "amount": get_number(p.get("金額")),
            "deadline": get_date(p.get("期限")),
            "members": get_multi_select(p.get("担当者")),
            "memo": get_text(p.get("メモ"))
        })
    return cases

def parse_tasks(rows):
    tasks = []
    for row in rows:
        p = row["properties"]
        tasks.append({
            "id": row["id"],
            "name": get_text(p.get("タスク名")),
            "case_ids": get_relation_ids(p.get("案件")),
            "member": get_select(p.get("担当者")),
            "priority": get_select(p.get("優先度")),
            "status": get_select(p.get("ステータス")),
            "deadline": get_date(p.get("期限")),
            "memo": get_text(p.get("メモ"))
        })
    return tasks

def main():
    print("Notionからデータ取得中...")
    cases = parse_cases(query_db(DB_IDS["cases"]))
    tasks = parse_tasks(query_db(DB_IDS["tasks"]))

    case_map = {c["id"]: c["name"] for c in cases}
    for t in tasks:
        t["case_name"] = case_map.get(t["case_ids"][0], "") if t["case_ids"] else ""

    active = [c for c in cases if c["status"] == "進行中"]
    negotiating = [c for c in cases if c["status"] == "商談中"]
    pending_tasks = [t for t in tasks if t["status"] != "完了"]

    data = {
        "updated_at": datetime.now().strftime("%Y/%m/%d %H:%M"),
        "business_axes": BUSINESS_AXES,
        "summary": {
            "active_cases": len(active),
            "negotiating_cases": len(negotiating),
            "pending_tasks": len(pending_tasks),
            "total_cases": len(cases)
        },
        "cases": cases,
        "tasks": tasks
    }

    os.makedirs("data", exist_ok=True)
    with open("data/data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"完了: 案件{len(cases)}件 / タスク{len(tasks)}件")

if __name__ == "__main__":
    main()
