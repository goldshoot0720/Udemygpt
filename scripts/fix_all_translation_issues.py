#!/usr/bin/env python3
"""Comprehensive translation fixer - applies all correction rules.

This script runs:
1. Simplified Chinese character fixes
2. Mainland-China terminology corrections
3. Flash message trap fixes
4. Other known error patterns

Usage:
    python3 scripts/fix_all_translation_issues.py [--dry-run] [--course COURSE_ID] [--force]
    
The --force flag will process courses even if they have been audited.
By default, only unprocessed courses are touched.
"""
import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Tuple

ROOT = Path(__file__).resolve().parents[1]

# Complete mapping: mainland term -> Taiwan term
TERM_DICT: Dict[str, str] = {
    # Programming fundamentals  
    "组件": "元件", "數組": "陣列", "数组": "陣列",
    "服务器": "伺服器", "服務器": "伺服器",
    "字符串": "字串", "源代码": "原始碼", "源代碼": "原始碼",
    "默认": "預設", "默認": "預設",
    "回调": "回呼", "回調": "回呼",
    "缓存": "快取", "緩存": "快取",
    "数据库": "資料庫", "數據庫": "資料庫",
    "变量": "變數", "變量": "變數",
    "异步": "非同步", "異步": "非同步",
    
    # File and system
    "文件夹": "資料夾", "文件夾": "資料夾",
    "视频": "影片", "視頻": "影片",
    "信息": "資訊",
    "软件": "軟體", "軟件": "軟體",
    "硬件": "硬體",
    "網絡": "網路", "网络": "網路",
    "鼠标": "滑鼠",
    "键盘": "鍵盤",
    "硬盘": "硬碟",
    "内存": "記憶體", "內存": "記憶體",
    "打印机": "印表機",
    "屏幕": "螢幕",
    "显示": "顯示",
    "点击": "點擊",
    "刷新": "重新整理",
    
    # Data and content
    "数据": "資料", "數據": "資料",
    "质量": "品質", "質量": "品質",
    "性能": "效能",
    "优化": "最佳化", "優化": "最佳化",
    "用户": "使用者", "用戶": "使用者",
    "接口": "介面",
    "对象": "物件", "對象": "物件", "對像": "物件",
    "函数": "函式", "函數": "函式",
    "布尔": "布林", "布爾值": "布林值",
    
    # Structure and flow
    "循环": "迴圈", "循環": "迴圈",
    "嵌套": "巢狀",
    "页面": "頁面", "頁面": "頁面",
    "登录": "登入", "登錄": "登入",
    "注册": "註冊", "註冊": "註冊",
    "保存": "儲存", "保存": "儲存",
    "加载": "載入", "加載": "載入", "加載": "載入",
    "线程": "執行緒", "線程": "執行緒",
    "进程": "行程", "進程": "行程",
    "配置": "設定", "设置": "設定", "設置": "設定",
}

# Simplified -> Traditional characters
SIMPLIFIED_MAP: Dict[str, str] = {
    "这": "這", "个": "個", "们": "們", "说": "說", "时": "時", "后": "後",
    "发": "發", "长": "長", "门": "門", "问": "問", "无": "無", "与": "與",
    "为": "為", "东": "東", "车": "車", "学": "學", "实": "實", "现": "現",
    "点": "點", "电": "電", "话": "話", "见": "見", "观": "觀", "认": "認",
    "识": "識", "让": "讓", "请": "請", "谁": "誰", "谢": "謝", "应": "應",
    "该": "該", "对": "對", "开关": "開關", "头": "頭", "买": "買", "卖": "賣",
    "制": "製", "页": "頁", "终": "終", "端": "端", "携": "攜", "剩": "剩",
    "愈": "愈", "简": "簡", "单": "單", "书": "書", "画": "畫", "夹": "夾",
    "乐": "樂", "丝": "絲", "举": "舉", "产": "產", "严": "嚴", "丧": "喪",
    "个": "個", "乌": "烏", "勾": "鉤", "乳": "乳", "乱": "亂", "刮": "刮",
    "刘": "劉", "务": "務", "动": "動", "助": "助", "勘": "勘", "协": "協",
    "劳": "勞", "肃": "肅", "兑": "兌", "兹": "茲", "养": "養", "美": "美",
    "义": "義", "鸟": "鳥", "气": "氣", "甩": "甩", "饭": "飯", "县": "縣",
    "医": "醫", "凭": "憑", "冯": "馮", "冲": "衝", "决": "決", "冷": "冷",
    "冻": "凍", "净": "淨", "减": "減", "凑": "湊", "准": "準", "凉": "涼",
}


def fix_simplified_text(text: str) -> Tuple[str, int]:
    """Fix simplified Chinese characters."""
    if not isinstance(text, str):
        return text, 0
    
    original = text
    change_count = 0
    
    for simp, trad in SIMPLIFIED_MAP.items():
        if simp in text:
            count = text.count(simp)
            text = text.replace(simp, trad)
            change_count += count
    
    return text, change_count


def fix_terminology(text: str) -> Tuple[str, int]:
    """Fix terminology errors."""
    if not isinstance(text, str):
        return text, 0
    
    original = text
    change_count = 0
    
    # Apply term replacements (longer terms first)
    for mainlander, taiwanese in sorted(TERM_DICT.items(), key=lambda x: -len(x[0])):
        if mainlander in text:
            text = text.replace(mainlander, taiwanese)
            change_count += 1
    
    # Handle flash message special case
    pattern = r"\bflash(?:ing|ed)?\s+(?:message|messages)\b"
    matches = len([m for m in re.finditer(pattern, text, re.I)])
    if matches > 0:
        text = re.sub(pattern, "flash 訊息", text, flags=re.I)
        change_count += matches
    
    return text, change_count


def fix_content(content: str) -> Tuple[str, int]:
    """Apply all fixes to content."""
    fixed = content
    total_changes = 0
    
    # First fix simplified characters
    fixed, count = fix_simplified_text(fixed)
    total_changes += count
    
    # Then fix terminology
    fixed, count = fix_terminology(fixed)
    total_changes += count
    
    return fixed, total_changes


def fix_lecture(lecture: dict) -> Tuple[dict, int]:
    """Fix all issues in a lecture."""
    fixed_lecture = lecture.copy()
    total_changes = 0
    
    # Fix title
    if "title" in fixed_lecture:
        fixed_title, count = fix_content(fixed_lecture["title"])
        if count > 0:
            fixed_lecture["title"] = fixed_title
            total_changes += count
    
    # Fix cues
    fixed_cues = []
    for cue in fixed_lecture.get("cues", []):
        fixed_cue = cue.copy()
        
        if "zh" in fixed_cue and isinstance(fixed_cue["zh"], str):
            fixed_zh, count = fix_content(fixed_cue["zh"])
            if count > 0:
                fixed_cue["zh"] = fixed_zh
                total_changes += count
        
        fixed_cues.append(fixed_cue)
    
    fixed_lecture["cues"] = fixed_cues
    return fixed_lecture, total_changes


def process_course(course_id: str, dry_run: bool = False) -> dict:
    """Process a single course with all fixes."""
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
        "change_types": {"simplified": 0, "terminology": 0},
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
        
        if changed_lectures:
            if not dry_run:
                backup_file = bundle_file.with_suffix(".backup")
                shutil.copy2(bundle_file, backup_file)
                
                for idx, fixed_lecture, _ in changed_lectures:
                    bundle_data["lectures"][idx] = fixed_lecture
                
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
    parser.add_argument("--dry-run", action="store_true", help="Preview mode")
    parser.add_argument("--course", type=str, help="Specific course ID")
    parser.add_argument("--force", action="store_true", help="Force processing audited courses")
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("🔧 翻譯綜合修正工具")
    print("=" * 80)
    print(f"日期：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"模式：{'乾預演' if args.dry_run else '實作模式'}")
    print(f"修正範圍：簡體轉換 + 術語修正 + Flash 陷阱")
    print("=" * 80)
    
    if args.course:
        courses = [args.course]
    else:
        courses = [p.name for p in sorted((ROOT / "data/courses").iterdir())
                  if (p / "translation-progress.json").exists()]
    
    total_stats = {
        "courses_total": len(courses),
        "courses_processed": 0,
        "courses_skipped": 0,
        "courses_changed": 0,
        "total_files_processed": 0,
        "total_files_changed": 0,
        "total_lectures_processed": 0,
        "total_lectures_changed": 0,
        "total_cues": 0,
        "total_changes": 0,
    }
    
    skipped_courses = []
    all_results = []
    
    for course_id in courses:
        # Check if should skip
        if not args.force:
            audit_file = ROOT / f"data/courses/{course_id}/translation-audit.json"
            if audit_file.exists():
                audit = json.loads(audit_file.read_text())
                if audit.get("verifiedVideoLectures", 0) > 0:
                    print(f"\n⚠️  {course_id}: 已通過審計，跳過")
                    skipped_courses.append(course_id)
                    total_stats["courses_skipped"] += 1
                    continue
        
        print(f"\n📦 處理課程 {course_id}...")
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
            
            print(f"✅ 檔案：{stats['files_processed']} → {stats['files_changed']} 修改")
            print(f"✅ 課堂：{stats['lectures_processed']} → {stats['lectures_changed']} 修改")
            print(f"✅ 總修正：{stats['total_changes']:,} 處")
            
            if stats["changes_by_file"]:
                top_files = sorted(stats["changes_by_file"], 
                                  key=lambda x: x["total_changes"], reverse=True)[:5]
                print("📝 修正最多的檔案:")
                for file_stat in top_files:
                    print(f"   • {file_stat['file']}: {file_stat['lectures_fixed']} 堂課 ({file_stat['total_changes']} 處)")
    
    # Summary
    print("\n" + "=" * 80)
    print("【結果摘要】")
    print("=" * 80)
    print(f"總課程數：{total_stats['courses_total']}")
    print(f"已處理：{total_stats['courses_processed']}")
    print(f"已跳過：{total_stats['courses_skipped']}")
    print(f"修改檔案：{total_stats['total_files_changed']} / {total_stats['total_files_processed']}")
    print(f"修改課堂：{total_stats['total_lectures_changed']} / {total_stats['total_lectures_processed']}")
    print(f"總字幕數：{total_stats['total_cues']:,}")
    print(f"總修正數：{total_stats['total_changes']:,}")
    
    if total_stats["total_changes"] > 0:
        print(f"\n💡 平均每堂課修正：{total_stats['total_changes'] / max(1, total_stats['total_lectures_changed']):.1f} 處")
        print(f"💡 平均每個字幕修正：{total_stats['total_changes'] / max(1, total_stats['total_cues'] // 10):.3f} 處")
    
    if args.dry_run:
        print("\nℹ️ 這是預覽模式，實際修改未執行。")
        print("確認結果後請再次執行（去掉 --dry-run）。")
    else:
        print("\n✨ 修正完成！備份檔案已保存至 *.backup")
        print("\n建議下一步:")
        print("  1. 檢查報告：cat data/import-reports/fix-report.json | less")
        print("  2. 重新驗證：python3 scripts/audit_translations.py")
        print("  3. 深度檢查：python3 scripts/deep_check_translations.py")
    
    # Save detailed report
    report = {
        "processedAt": datetime.now().isoformat(),
        "mode": "dry-run" if args.dry_run else "live",
        "statistics": total_stats,
        "skippedCourses": skipped_courses,
        "results": all_results,
    }
    
    report_file = ROOT / "data/import-reports/fix-report.json"
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"\n📄 詳細報告：{report_file}")
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
