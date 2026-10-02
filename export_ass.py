"""Merge verified zh-TW translations with English cues into bilingual animated .ass subtitles. No model calls."""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COURSES = ROOT / "data/courses"

# Same keyword list as udemy-bilingual/content.js; ASCII word boundaries match JavaScript \b next to Chinese.
TERMS = re.compile(r"\b(Claude(?: Code)?|Codex|Flutter|Dart|Node(?:\.js|JS)?|React Native|NativeScript|Angular|Svelte(?:\.js)?"
                   r"|Remix(?:\.js)?|GraphQL|Express|MongoDB|Deno|Flexbox|Sass|React(?:\.js)?|JavaScript|TypeScript|JSX|Redux"
                   r"|Next\.js|Hooks?|useState|useEffect|useReducer|useRef|useContext|props|state|components?|DOM|API|HTTP|CSS|HTML|Vite)\b",
                   re.I | re.A)

# Colours are &HAABBGGRR. Mirrors the extension's glow / cinema / minimal looks.
EFFECTS = {
    "glow": {"box": 3, "outline": 6, "shadow": 0, "back": "&H30271508", "mark": "&H00FFE679", "fade": 160},
    "cinema": {"box": 1, "outline": 3, "shadow": 2, "back": "&H00000000", "mark": "&H009DE2FF", "fade": 160},
    "minimal": {"box": 3, "outline": 5, "shadow": 0, "back": "&H66000000", "mark": None, "fade": 0},
}


def stamp(seconds):
    cs = max(0, round(seconds * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def escape(text):
    text = " ".join(text.split())
    return text.replace("\\", "＼").replace("{", "｛").replace("}", "｝")


def paint(text, style, mark):
    text = escape(text)
    if not mark:
        return text
    return TERMS.sub(lambda m: f"{{\\c{mark}&\\b1}}{m[0]}{{\\r{style}}}", text)


def render(course, lecture, effect, offset, font):
    e = EFFECTS[effect]
    def style(name, size, colour, bold):
        return (f"Style: {name},{font},{size},{colour},&H000000FF,{e['back']},{e['back']},{bold},0,0,0,100,100,0,0,"
                f"{e['box']},{e['outline']},{e['shadow']},2,80,80,70,1")
    head = [
        "[Script Info]",
        f"Title: {course.get('courseTitle', course['courseId'])} - {lecture['title']}",
        "ScriptType: v4.00+", "WrapStyle: 0", "ScaledBorderAndShadow: yes",
        "PlayResX: 1920", "PlayResY: 1080", "YCbCr Matrix: TV.709", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        style("ZH", 66, "&H00FFFFFF", -1),
        style("EN", 50, "&H00FFEAE1", 0),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    fade = f"\\fad({e['fade']},0)" if e["fade"] else ""
    lines = []
    for cue in lecture["cues"]:
        start, end = cue["start"] + offset, cue["end"] + offset
        if end <= 0:
            continue
        zh, en = cue.get("zh", "").strip(), cue["en"].strip()
        body = f"{{{fade}}}" if fade else ""
        if zh:
            body += paint(zh, "ZH", e["mark"]) + "\\N{\\rEN}"
        body += paint(en, "EN", e["mark"])
        lines.append(f"Dialogue: 0,{stamp(start)},{stamp(end)},{'ZH' if zh else 'EN'},,0,0,0,,{body}")
    return "\n".join(head + lines) + "\n"


def translated_lectures(course_dir):
    """Yield (bundle, lecture) for every lecture with Chinese, newest file winning on duplicates."""
    seen = {}
    for path in sorted((course_dir / "translations").glob("*.json"), key=lambda p: p.stat().st_mtime):
        bundle = json.loads(path.read_text(encoding="utf-8"))
        for lecture in bundle.get("lectures", []):
            if lecture.get("cues") and all(c.get("zh", "").strip() for c in lecture["cues"]):
                seen[str(lecture["id"])] = (bundle, lecture)
    return seen.values()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course", help="Course ID, e.g. 4958062")
    parser.add_argument("--lecture", help="Only this lecture ID")
    parser.add_argument("--effect", choices=EFFECTS, default="glow")
    parser.add_argument("--offset", type=float, default=0, help="Shift every cue by seconds")
    parser.add_argument("--font", default="Noto Sans TC")
    parser.add_argument("--out", help="Default: data/courses/ID/subtitles-ass")
    args = parser.parse_args()
    course_dir = COURSES / args.course
    out = Path(args.out) if args.out else course_dir / "subtitles-ass"
    out.mkdir(parents=True, exist_ok=True)
    written = 0
    for bundle, lecture in translated_lectures(course_dir):
        if args.lecture and str(lecture["id"]) != args.lecture:
            continue
        order = int(lecture.get("lectureOrder", 0))
        title = re.sub(r'[\\/:*?"<>|\s]+', "-", lecture["title"]).strip("-")[:60]
        path = out / f"{order:03d}-{lecture['id']}-{title}.ass"
        path.write_text(render(bundle, lecture, args.effect, args.offset, args.font), encoding="utf-8-sig")
        written += 1
    print(json.dumps({"courseId": int(args.course), "effect": args.effect, "written": written, "folder": str(out)}, ensure_ascii=False))
    if not written:
        print(f"沒有可匯出的講座：{course_dir / 'translations'} 尚無全部填妥中文的譯文。"
              "先用 course_queue.py verify 存入 ChatGPT 譯文。", file=sys.stderr)


if __name__ == "__main__":
    main()
