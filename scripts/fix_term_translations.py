#!/usr/bin/env python3
"""Auto-fix mainland-China terminology in zh-TW translations.

Uses a curated dictionary to replace Mainland Chinese terms with their
Taiwan equivalents. Runs safely by:
  1. Backing up each file before modification
  2. Recording all changes
  3. Never modifying files that already pass the audit
  
Usage:
    python3 scripts/fix_term_translations.py [--dry-run] [--course COURSE_ID]
"""
import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]

# Complete mainland -> Taiwan term mapping
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
    "回车": "Enter",
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
    
    # UI and interaction
    "滚动": "捲動", "滾動": "捲動",
    "输入": "輸入", "輸入": "輸入",
    "输出": "輸出", "輸出": "輸出",
    "菜单": "選單", "菜單": "選單",
    "图标": "圖示", "圖標": "圖示",
    "按钮": "按鈕", "按鈕": "按鈕",
    "标签": "標籤", "標籤": "標籤",
    "窗口": "視窗", "視窗": "視窗",
    "对话框": "對話框", "對話框": "對話框",
    "提示": "提示", "提示": "提示",
    
    # Network
    "地址": "位址", "位址": "位址",
    "连接": "連線", "連接": "連線",
    "下载": "下載", "下載": "下載",
    "上传": "上傳", "上傳": "上傳",
    "域名": "網域", "網域": "網域",
    "服务器端": "伺服器端", "服務器端": "伺服器端",
    
    # Development tools
    "编译器": "編譯器", "編譯器": "編譯器",
    "调试": "除錯", "除錯": "除錯",
    "版本控制": "版本控制", "版本控制": "版本控制",
    "仓库": "倉儲", "倉庫": "倉儲",
    "分支": "分支", "分支": "分支",
    "合并": "合併", "合併": "合併",
    "提交": "提交", "提交": "提交",
    "拉取": "拉取", "拉取": "拉取",
    "推送": "推送", "推送": "推送",
    
    # Testing
    "测试": "測試", "測試": "測試",
    "单元测试": "單元測試", "單元測試": "單元測試",
    "集成测试": "整合測試", "整合測試": "整合測試",
    "自动化": "自動化", "自動化": "自動化",
    "用例": "用例会", "用例会": "用例会",
    
    # Design patterns
    "模式": "模式", "模式": "模式",
    "单例": "單一例", "單一例": "單一例",
    "工厂": "工廠", "工廠": "工廠",
    "观察者": "觀察者", "觀察者": "觀察者",
    "适配器": "配適器", "配適器": "配適器",
    "装饰器": "裝飾器", "裝飾器": "裝飾器",
    "代理": "代理人", "代理人": "代理人",
    
    # Other common terms
    "认为": "認為", "認為": "認為",
    "需要": "需要", "需要": "需要",
    "可能": "可能", "可能": "可能",
    "应该": "應該", "應該": "應該",
    "可以": "可以", "可以": "可以",
    "开始": "開始", "開始": "開始",
    "结束": "結束", "結束": "結束",
    "继续": "繼續", "繼續": "繼續",
    "检查": "檢查", "檢查": "檢查",
    "处理": "處理", "處理": "處理",
    "分析": "分析", "分析": "分析",
    "创建": "建立", "建立": "建立",
    "删除": "刪除", "刪除": "刪除",
    "修改": "修改", "修改": "修改",
    "复制": "複製", "複製": "複製",
    "粘贴": "貼上", "貼上": "貼上",
    "剪切": "剪下", "剪下": "剪下",
}

# Special case: flash message trap
FLASH_FIXES = [
    (r"\bflash(?:ing|ed)?\s+(?:message|messages)\b", "flash 訊息"),
]


def should_skip_course(course_id: str) -> bool:
    """Check if this course should be skipped based on audit status."""
    audit_file = ROOT / f"data/courses/{course_id}/translation-audit.json"
    if audit_file.exists():
        audit = json.loads(audit_file.read_text())
        # Skip courses that have been manually audited
        return audit.get("verifiedVideoLectures", 0) > 0
    return False


def fix_terminology(text: str) -> Tuple[str, int]:
    """Fix terminology errors in text. Returns (fixed_text, change_count)."""
    if not isinstance(text, str):
        return text, 0
    
    original = text
    change_count = 0
    
    # Apply term replacements (longer terms first to avoid partial matches)
    for mainlander, taiwanese in sorted(TERM_DICT.items(), key=lambda x: -len(x[0])):
        if mainlander in text:
            text = text.replace(mainlander, taiwanese)
            change_count += 1
    
    # Handle flash message special case
    for pattern, replacement in FLASH_FIXES:
        matches = len([m for m in re.finditer(pattern, text, re.I)])
        if matches > 0:
            text = re.sub(pattern, replacement, text, flags=re.I)
            change_count += matches
    
    return text, change_count


def fix_lecture(lecture: dict) -> Tuple[dict, int]:
    """Fix terminology in a lecture. Returns (fixed_lecture, total_changes)."""
    fixed_lecture = lecture.copy()
    total_changes = 0
    
    # Fix lecture title
    if "title" in fixed_lecture:
        fixed_title, count = fix_terminology(fixed_lecture["title"])
        if count > 0:
            fixed_lecture["title"] = fixed_title
            total_changes += count
    
    # Fix cues
    fixed_cues = []
    for cue in fixed_lecture.get("cues", []):
        fixed_cue = cue.copy()
        
        # Fix zh field
        if "zh" in fixed_cue and isinstance(fixed_cue["zh"], str):
            fixed_zh, count = fix_terminology(fixed_cue["zh"])
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
        original_hash = hash(bundle_data)
        
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
                backup_file = bundle_file.with_suffix(".json.backup")
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
    print("翻譯術語自動修正工具")
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
        if not args.force and should_skip_course(course_id):
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
            print(f"  ✅ 總計修正：{stats['total_changes']} 處")
            
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
    print(f"總修正數：{total_stats['total_changes']:,}")
    
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
    
    report_file = ROOT / "data/import-reports/term-fix-report.json"
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"\n報告已保存至：{report_file}")
    
    return 0 if total_stats["total_changes"] == 0 or args.dry_run else 1


if __name__ == "__main__":
    import re
    raise SystemExit(main())
