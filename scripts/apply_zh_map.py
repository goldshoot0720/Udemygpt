"""Apply zh translation maps to course lecture sources and emit verifiable result files.

Usage:
    python3 scripts/apply_zh_map.py COURSE_ID MAP.json [MAP2.json ...] [--out DIR]

Each map is {"<lectureId>": {"<cueId>": "<zh>", ...}, ...}. For every lecture in the
map the matching per-lecture source file is copied with the Chinese filled in and
written to the output directory; the printed lines are the course_queue.py verify
commands for those files.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course")
    parser.add_argument("maps", nargs="+")
    parser.add_argument("--out")
    args = parser.parse_args()

    course_dir = ROOT / "data/courses" / str(args.course)
    ledger = json.loads((course_dir / "translation-progress.json").read_text(encoding="utf-8"))
    sources = {str(item["lectureId"]): Path(item["sourceFile"]) for item in ledger["lectures"]}

    merged_maps = {}
    for path in args.maps:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        for lecture_id, cues in data.items():
            if str(lecture_id) in merged_maps:
                raise SystemExit(f"duplicate lecture in maps: {lecture_id}")
            merged_maps[str(lecture_id)] = cues

    out_dir = Path(args.out) if args.out else course_dir / "work" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    commands = []
    for lecture_id, cues in merged_maps.items():
        source_path = sources.get(str(lecture_id))
        if not source_path or not source_path.exists():
            raise SystemExit(f"unknown lecture id: {lecture_id}")
        source = json.loads(source_path.read_text(encoding="utf-8"))
        lecture = source["lectures"][0]
        known = {str(cue["id"]) for cue in lecture["cues"]}
        missing = [cue["id"] for cue in lecture["cues"] if not str(cues.get(str(cue["id"]), "")).strip()]
        extra = [key for key in cues if key not in known]
        if missing or extra:
            raise SystemExit(f"lecture {lecture_id}: missing={missing[:8]} extra={extra[:8]}")
        for cue in lecture["cues"]:
            cue["zh"] = str(cues[str(cue["id"])]).strip()
        target = out_dir / f"result-{lecture_id}.json"
        target.write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
        commands.append(
            f"python3 course_queue.py verify --course {args.course} --id {lecture_id} "
            f"--file {target.relative_to(ROOT)}"
        )
        print(f"lecture {lecture_id}: {len(lecture['cues'])} cues -> {target.relative_to(ROOT)}")
    (out_dir / "verify-commands.txt").write_text("\n".join(commands) + "\n", encoding="utf-8")
    print(f"{len(commands)} result files; commands in {(out_dir / 'verify-commands.txt').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
