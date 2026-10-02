"""Split English course files or verify/merge ChatGPT translations. No model calls."""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def resolve_source(path):
    """Allow a saved React checkpoint to read a file moved into its course folder."""
    target = Path(path)
    if target.exists():
        return target
    try:
        relative = target.resolve().relative_to(ROOT / "data")
    except ValueError:
        return target
    course = ROOT / "data/courses/1362070"
    if relative.parts[0] in ("lecture-queue", "chatgpt-batches"):
        return course / relative
    if len(relative.parts) == 1:
        if target.name.startswith("tw-"):
            return course / "translations" / target.name
        if target.name.startswith("ChatGPT-"):
            return course / "translations/lectures" / target.name
        if target.name == "English-38345146.json":
            return course / "english-exports" / target.name
        if target.name == "curriculum-1362070.json":
            return course / "curriculum.json"
        if target.name in ("English-course-1362070.json", "translation-progress.json"):
            return course / target.name
    return target


def load(path):
    return json.loads(resolve_source(path).read_text(encoding="utf-8"))


def verify(source, translated):
    for name in ("version", "courseId", "sourceLanguage", "targetLanguage"):
        if source.get(name) != translated.get(name):
            raise ValueError(f"Metadata changed: {name}")
    expected = {str(item["id"]): item for item in source["lectures"]}
    found = set()
    for lecture in translated["lectures"]:
        identity = str(lecture["id"])
        if identity not in expected or identity in found:
            raise ValueError(f"Unexpected or duplicate lecture: {identity}")
        found.add(identity)
        original = expected[identity]
        for name in ("id", "title", "sourceHash"):
            if lecture.get(name) != original.get(name):
                raise ValueError(f"Lecture {identity}: {name} changed")
        if len(lecture["cues"]) != len(original["cues"]):
            raise ValueError(f"Lecture {identity}: cue count changed")
        for cue, before in zip(lecture["cues"], original["cues"]):
            for name in ("id", "start", "end", "en"):
                if cue.get(name) != before.get(name):
                    raise ValueError(f"Lecture {identity}, cue {before['id']}: {name} changed")
            if not isinstance(cue.get("zh"), str) or not cue["zh"].strip():
                raise ValueError(f"Lecture {identity}, cue {before['id']}: missing Chinese")
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("--split", metavar="DIRECTORY")
    parser.add_argument("--max-cues", type=int, default=800)
    parser.add_argument("--translations", nargs="+")
    parser.add_argument("--output", help="Default: data/courses/COURSE_ID/translations/ChatGPT-verified.json")
    args = parser.parse_args()
    source = load(args.source)
    if args.split:
        folder = Path(args.split)
        folder.mkdir(parents=True, exist_ok=True)
        chunks, chunk, count = [], [], 0
        for lecture in source["lectures"]:
            size = len(lecture["cues"])
            if chunk and count + size > args.max_cues:
                chunks.append(chunk)
                chunk, count = [], 0
            chunk.append(lecture)
            count += size
        if chunk:
            chunks.append(chunk)
        index = []
        for number, lectures in enumerate(chunks, 1):
            data = copy.deepcopy(source)
            data["lectures"], data["errors"] = lectures, []
            name = f"English-batch-{number:03}.json"
            (folder / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            index.append({"file": name, "lectures": len(lectures), "cues": sum(len(x["cues"]) for x in lectures)})
        (folder / "progress.json").write_text(json.dumps({"batches": index, "completed": []}, indent=2), encoding="utf-8")
        print(f"Prepared {len(chunks)} batches, {len(source['lectures'])} lectures")
    if args.translations:
        merged, seen = [], set()
        for path in args.translations:
            translated = load(path)
            identities = verify(source, translated)
            if seen & identities:
                raise ValueError("Duplicate lectures across translation files")
            seen.update(identities)
            merged.extend(translated["lectures"])
        order = {str(x["id"]): i for i, x in enumerate(source["lectures"])}
        merged.sort(key=lambda x: order[str(x["id"])])
        result = copy.deepcopy(source)
        result["lectures"] = merged
        result["translationProvider"] = "ChatGPT online"
        course_id = source.get("courseId")
        if not args.output and (type(course_id) is not int or course_id <= 0):
            raise ValueError("A valid courseId is required to choose the course output folder")
        target = Path(args.output) if args.output else ROOT / f"data/courses/{course_id}/translations/ChatGPT-verified.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Verified {len(merged)}/{len(source['lectures'])} lectures; {sum(len(x['cues']) for x in merged)} translated cues")


if __name__ == "__main__":
    main()
