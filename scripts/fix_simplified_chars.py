#!/usr/bin/env python3
"""Fix Simplified Chinese characters in zh-TW translations.

Replaces Simplified Chinese characters with their Traditional Chinese equivalents.
Runs safely by backing up each file before modification and recording all changes.

Usage:
    python3 scripts/fix_simplified_chars.py [--dry-run] [--course COURSE_ID]
"""
import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]

# Common Simplified -> Traditional character mappings
SIMPLIFIED_TO_TRADITIONAL: Dict[str, str] = {
    # Basic common characters
    "这": "這", "个": "個", "们": "們", "说": "說", "时": "時", "后": "後",
    "发": "發", "长": "長", "门": "門", "问": "問", "无": "無", "与": "與",
    "为": "為", "东": "東", "车": "車", "学": "學", "实": "實", "现": "現",
    "点": "點", "电": "電", "话": "話", "见": "見", "观": "觀", "认": "認",
    "识": "識", "让": "讓", "请": "請", "谁": "誰", "谢": "謝", "应": "應",
    "该": "該", "对": "對", "开关": "開關", "头": "頭", "买": "買", "卖": "賣",
    "卢": "盧", "卫": "衛", "却": "卻", "厂": "廠", "厅": "廳", "历": "歷",
    "厉": "厲", "压": "壓", "厌": "厭", "厕": "廁", "厘": "釐", "厢": "廂",
    "厦": "廈", "厨": "廚", "厮": "廝", "县": "縣", "叁": "參", "参": "參",
    "双": "雙", "发": "髮", "变": "變", "叙": "敘", "叠": "疊", "叶": "葉",
    "号": "號", "叹": "嘆", "吗": "嗎", "听": "聽", "启": "啟", "吴": "吳",
    "呐": "吶", "员": "員", "呛": "噆", "呜": "嗚", "咏": "詠", "咙": "嚨",
    "咸": "鹹", "响": "響", "哑": "啞", "哗": "嘩", "哟": "喲", "唤": "喚",
    "啧": "嘖", "啰": "囉", "啸": "嘯", "喷": "噴", "喽": "囉", "嘱": "囑",
    "噜": "嚕", "团": "團", "园": "園", "围": "圍", "图": "圖", "圆": "圓",
    "圣": "聖", "场": "場", "坏": "壞", "块": "塊", "坚": "堅", "坛": "壇",
    "坝": "壩", "坟": "墳", "坠": "墜", "垄": "壟", "垒": "壘", "垦": "墾",
    "垫": "墊", "垮": "垮", "埋": "埋", "堕": "墮", "墙": "牆", "壮": "壯",
    "声": "聲", "壳": "殼", "处": "處", "备": "備", "复": "復", "够": "夠",
    "头": "頭", "夹": "夾", "夺": "奪", "奋": "奮", "奖": "獎", "妆": "妝",
    "妇": "婦", "妈": "媽", "妍": "姸", "娄": "婁", "娇": "嬌", "娱": "娛",
    "婴": "嬰", "嫌": "嫌", "嫒": "嬡", "孙": "孫", "宁": "寧", "宝": "寶",
    "实": "實", "宠": "寵", "审": "審", "宪": "憲", "宫": "宮", "宽": "寬",
    "宾": "賓", "寝": "寢", "寻": "尋", "导": "導", "寿": "壽", "将": "將",
    "尔": "爾", "尘": "塵", "尝": "嘗", "尧": "堯", "尴": "尷", "层": "層",
    "屉": "屜", "届": "屆", "属": "屬", "岁": "歲", "岂": "豈", "岗": "崗",
    "岛": "島", "岭": "嶺", "峡": "峽", "峦": "巒", "峰": "峯", "崃": "嶍",
    "崭": "嶄", "巅": "巔", "巩": "鞏", "帅": "帥", "师": "師", "帐": "帳",
    "帘": "簾", "帜": "幟", "带": "帶", "帮": "幫", "幂": "冪", "幇": "邦",
    "干": "乾", "并": "並", "广": "廣", "庄": "莊", "庆": "慶", "庐": "廬",
    "库": "庫", "应": "應", "庙": "廟", "庞": "龐", "废": "廢", "庼": "廄",
    
    # Medical and other specialized terms
    "体": "體", "余": "餘", "俩": "倆", "俭": "儉", "债": "債", "倾": "傾",
    "偿": "償", "储": "儲", "儿": "兒", "兑": "兌", "兴": "興", "兹": "茲",
    "养": "養", "兽": "獸", "内": "內", "冈": "岡", "册": "冊", "军": "軍",
    "农": "農", "冲": "衝", "决": "決", "况": "況", "冻": "凍", "净": "淨",
    "减": "減", "凑": "湊", "刘": "劉", "则": "則", "刚": "剛", "创": "創",
    "删": "刪", "利": "利", "别": "別", "刮": "刮", "制": "製", "刹": "剎",
    "剂": "劑", "剩": "剩", "剪": "剪", "划": "劃", "办": "辦", "务": "務",
    "动": "動", "励": "勵", "劲": "勁", "势": "勢", "勋": "勳", "勤": "勤",
    "区": "區", "医": "醫", "华": "華", "协": "協", "单": "單", "卖": "賣",
}


def fix_simplified_text(text: str) -> Tuple[str, int]:
    """Fix Simplified Chinese characters in text. Returns (fixed_text, change_count)."""
    if not isinstance(text, str):
        return text, 0
    
    original = text
    change_count = 0
    
    # Replace each simplified character
    for simp, trad in SIMPLIFIED_TO_TRADITIONAL.items():
        if simp in text:
            count = text.count(simp)
            text = text.replace(simp, trad)
            change_count += count
    
    return text, change_count


def fix_lecture(lecture: dict) -> Tuple[dict, int]:
    """Fix simplified characters in a lecture. Returns (fixed_lecture, total_changes)."""
    fixed_lecture = lecture.copy()
    total_changes = 0
    
    # Fix lecture title
    if "title" in fixed_lecture:
        fixed_title, count = fix_simplified_text(fixed_lecture["title"])
        if count > 0:
            fixed_lecture["title"] = fixed_title
            total_changes += count
    
    # Fix cues
    fixed_cues = []
    for cue in fixed_lecture.get("cues", []):
        fixed_cue = cue.copy()
        
        # Fix zh field
        if "zh" in fixed_cue and isinstance(fixed_cue["zh"], str):
            fixed_zh, count = fix_simplified_text(fixed_cue["zh"])
            if count > 0:
                fixed_cue["zh"] = fixed_zh
                total_changes += count
        
        fixed_cues.append(fixed_cue)
    
    fixed_lecture["cues"] = fixed_cues
    return fixed_lecture, total_changes


def process_course(course_id: str, dry_run: bool = False) -> dict:
    """Process a single course. Returns statistics."""
    course_dir = ROOT / f"data/courses/{course_id}"
    translations_dir = course_dir / "translations"
    
    stats = {
        "course_id": course_id,
        "files_processed": 0,
        "files_changed": 0,
        "lectures_processed": 0,
        "lectures_changed": 0,
        "total_cues": 0,
        "total_changes": 0,
        "changes_by_file": [],
    }
    
    if not translations_dir.exists():
        return stats
    
    for bundle_file in sorted(translations_dir.glob("tw-*.json")):
        bundle_data = json.loads(bundle_file.read_text())
        
        changed_lectures = []
        lectures_fixed = 0
        
        for i, lecture in enumerate(bundle_data.get("lectures", [])):
            fixed_lecture, changes = fix_lecture(lecture)
            if changes > 0:
                changed_lectures.append((i, fixed_lecture, changes))
                lectures_fixed += 1
                stats["total_changes"] += changes
        
        # Write back if any changes
        if changed_lectures:
            if not dry_run:
                # Backup original
                backup_file = bundle_file.with_suffix(".backup")
                shutil.copy2(bundle_file, backup_file)
                
                # Update bundle
                for idx, fixed_lecture, _ in changed_lectures:
                    bundle_data["lectures"][idx] = fixed_lecture
                
                # Write modified file
                bundle_file.write_text(
                    json.dumps(bundle_data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8"
                )
            
            stats["files_changed"] += 1
            stats["changes_by_file"].append({
                "file": bundle_file.name,
                "lectures_fixed": lectures_fixed,
                "total_changes": sum(c[2] for c in changed_lectures),
                "backup": str(backup_file) if not dry_run else None,
            })
        
        stats["files_processed"] += 1
        stats["lectures_processed"] += len(bundle_data.get("lectures", []))
        stats["lectures_changed"] += lectures_fixed
        stats["total_cues"] += sum(len(l.get("cues", [])) for l in bundle_data.get("lectures", []))
    
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                       help="Show what would be changed without making modifications")
    parser.add_argument("--course", type=str,
                       help="Process only specific course ID")
    parser.add_argument("--force", action="store_true",
                       help="Force processing even if course has been audited")
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("簡繁轉換修正工具")
    print(f"日期：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"模式：{'乾預演' if args.dry_run else '實作模式'}")
    print("=" * 80)
    
    if args.course:
        courses = [args.course]
    else:
        courses = [p.name for p in sorted((ROOT / "data/courses").iterdir())
                  if (p / "translation-progress.json").exists()]
    
    total_stats = {
        "courses_processed": 0,
        "courses_changed": 0,
        "total_files_processed": 0,
        "total_files_changed": 0,
        "total_lectures_processed": 0,
        "total_lectures_changed": 0,
        "total_cues": 0,
        "total_changes": 0,
    }
    
    all_results = []
    
    for course_id in courses:
        if not args.force:
            audit_file = ROOT / f"data/courses/{course_id}/translation-audit.json"
            if audit_file.exists():
                audit = json.loads(audit_file.read_text())
                if audit.get("verifiedVideoLectures", 0) > 0:
                    print(f"\n⚠️  課程 {course_id}: 已通過審計，跳過（使用 --force 強制處理）")
                    continue
        
        print(f"\n📁 處理課程 {course_id}...")
        stats = process_course(course_id, dry_run=args.dry_run)
        
        if stats["files_changed"] > 0 or args.dry_run:
            all_results.append(stats)
            total_stats["courses_processed"] += 1
            total_stats["courses_changed"] += stats["files_changed"]
            total_stats["total_files_processed"] += stats["files_processed"]
            total_stats["total_files_changed"] += stats["files_changed"]
            total_stats["total_lectures_processed"] += stats["lectures_processed"]
            total_stats["total_lectures_changed"] += stats["lectures_changed"]
            total_stats["total_cues"] += stats["total_cues"]
            total_stats["total_changes"] += stats["total_changes"]
            
            print(f"  ✅ 檔案：{stats['files_processed']} 個 (修改：{stats['files_changed']})")
            print(f"  ✅ 課堂：{stats['lectures_processed']} 堂 (修改：{stats['lectures_changed']})")
            print(f"  ✅ 總計修正：{stats['total_changes']} 處簡繁體錯誤")
            
            if stats["changes_by_file"]:
                print("  📝 詳細:")
                for file_stat in stats["changes_by_file"][:5]:
                    print(f"    - {file_stat['file']}: {file_stat['lectures_fixed']} 堂課 ({file_stat['total_changes']} 處)")
                if len(stats["changes_by_file"]) > 5:
                    print(f"    ...還有 {len(stats['changes_by_file']) - 5} 個檔案")
    
    print("\n" + "=" * 80)
    print("【總結】")
    print("=" * 80)
    print(f"處理課程：{total_stats['courses_processed']} / {len(courses)}")
    print(f"修改檔案：{total_stats['total_files_changed']} / {total_stats['total_files_processed']}")
    print(f"修改課堂：{total_stats['total_lectures_changed']} / {total_stats['total_lectures_processed']}")
    print(f"總字幕數：{total_stats['total_cues']:,}")
    print(f"總修正數：{total_stats['total_changes']:,} 處簡繁錯誤")
    
    if args.dry_run:
        print("\n這是預覽模式，實際修改未執行。")
        print("請確認結果後再次執行（去掉 --dry-run）。")
    else:
        print("\n✅ 修正完成！備份檔案已保存在 *.backup")
    
    # Save report
    report = {
        "processedAt": datetime.now().isoformat(),
        "dryRun": args.dry_run,
        "statistics": total_stats,
        "results": all_results,
    }
    
    report_file = ROOT / "data/import-reports/simplif-fix-report.json"
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"\n報告已保存至：{report_file}")
    
    return 0 if total_stats["total_changes"] == 0 or args.dry_run else 1


if __name__ == "__main__":
    import shutil
    raise SystemExit(main())
