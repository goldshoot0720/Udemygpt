#!/usr/bin/env python3
"""Create AssemblyAI candidates for lectures without original-language captions.

The API key is read only from ASSEMBLYAI_API_KEY. Raw candidate responses are
saved separately from the selected source and never replace it here.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "data/missing-english-sources.json"
API = "https://api.assemblyai.com/v2"
MODEL = "universal-3-5-pro"

GENERAL_KEYTERMS = [
    "JavaScript", "TypeScript", "HTML", "CSS", "DOM", "API", "component",
]
SVELTE_KEYTERMS = [
    "Svelte", "Svelte component", "JavaScript", "HTML", "CSS", "DOM",
    "Svelte store", "bind:this", "querySelector", "isFav", "Badge.svelte",
    "favorite", "unfavorite", "writable store", "readable store",
]


def request_json(url: str, api_key: str, body: dict | None = None) -> dict:
    headers = {"Authorization": api_key}
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        # Do not print request headers or the API key.
        message = exc.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"AssemblyAI returned HTTP {exc.code}: {message}") from None


def upload(path: Path, api_key: str) -> str:
    req = urllib.request.Request(
        f"{API}/upload",
        data=path.read_bytes(),
        headers={
            "Authorization": api_key,
            "Content-Type": "application/octet-stream",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            return json.loads(response.read())["upload_url"]
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"AssemblyAI upload returned HTTP {exc.code}: {message}") from None


def transcribe(
    audio_url: str,
    api_key: str,
    course_title: str,
    language: str,
    keyterms: list[str],
) -> dict:
    if language.lower().startswith("ja"):
        prompt = (
            f"A Japanese-language programming tutorial about {course_title}. "
            "Transcribe the spoken Japanese faithfully. Preserve commonly used "
            "English software names, code identifiers, and technical terms."
        )
    elif language.lower().startswith("en"):
        prompt = f"An English programming tutorial about {course_title}."
    else:
        prompt = f"A {language}-language programming tutorial about {course_title}."
    submitted = request_json(
        f"{API}/transcript",
        api_key,
        {
            "audio_url": audio_url,
            "speech_models": [MODEL],
            "language_code": language,
            "prompt": prompt,
            "keyterms_prompt": keyterms,
            "speaker_labels": False,
        },
    )
    transcript_id = submitted["id"]
    deadline = time.monotonic() + 20 * 60
    while time.monotonic() < deadline:
        result = request_json(f"{API}/transcript/{transcript_id}", api_key)
        status = result.get("status")
        if status == "completed":
            return result
        if status == "error":
            raise RuntimeError(f"Transcription {transcript_id} failed: {result.get('error', 'unknown error')}")
        time.sleep(3)
    raise TimeoutError(f"Transcription {transcript_id} did not finish within 20 minutes")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="JSON list of lectures missing source-language captions",
    )
    parser.add_argument("--course", type=int, help="Limit processing to one course ID")
    parser.add_argument("--lecture", help="Transcribe only this lecture ID")
    parser.add_argument(
        "--language",
        help="Override each entry's sourceLanguage (for example en or ja)",
    )
    parser.add_argument("--force", action="store_true", help="Replace an existing candidate")
    args = parser.parse_args()

    api_key = os.environ.get("ASSEMBLYAI_API_KEY")
    if not api_key:
        print("Set ASSEMBLYAI_API_KEY in the environment; the key is never saved by this script.", file=sys.stderr)
        return 2

    manifest_file = args.manifest.expanduser().resolve()
    missing = json.loads(manifest_file.read_text(encoding="utf-8"))
    entries = [
        item for item in missing["lectures"]
        if (args.course is None or int(item["courseId"]) == args.course)
        and (args.lecture is None or str(item["lectureId"]) == str(args.lecture))
    ]
    if not entries:
        print(f"No matching entries in {manifest_file} for course {args.course}.", file=sys.stderr)
        return 2

    for item in entries:
        audio = Path(item["audioSource"]["file"])
        if not audio.is_absolute():
            audio = ROOT / audio
        audio = audio.resolve()
        if not audio.is_file():
            raise FileNotFoundError(f"Audio file not found for lecture {item['lectureId']}: {audio}")
        language = args.language or item.get("sourceLanguage") or item.get("language") or "en"
        language = str(language)
        output_dir = ROOT / "data" / "courses" / str(item["courseId"]) / "repair/transcripts/assemblyai"
        if language.lower() not in {"en", "en_us", "en_gb"}:
            output_dir /= language.lower()
        output_dir.mkdir(parents=True, exist_ok=True)
        output = output_dir / f"{item['lectureId']}.json"
        if output.exists() and not args.force:
            print(f"Skip {item['lectureId']}: candidate already exists")
            continue

        audio_bytes = audio.read_bytes()
        audio_hash = hashlib.sha256(audio_bytes).hexdigest()
        print(f"Uploading lecture {item['lectureOrder']}: {item['title']}", flush=True)
        audio_url = upload(audio, api_key)
        course_title = item.get("courseTitle", "a programming course")
        keyterms = SVELTE_KEYTERMS if "svelte" in course_title.lower() else GENERAL_KEYTERMS
        result = transcribe(audio_url, api_key, course_title, language, keyterms)
        candidate = {
            "schemaVersion": 1,
            "lectureId": str(item["lectureId"]),
            "lectureOrder": int(item["lectureOrder"]),
            "title": item["title"],
            "engine": "assemblyai",
            "modelRequested": MODEL,
            "modelUsed": result.get("speech_model_used"),
            "requestedLanguage": language,
            "language": result.get("language_code"),
            "transcriptId": result.get("id"),
            "audioSHA256": audio_hash,
            "audioDurationSeconds": result.get("audio_duration"),
            "confidence": result.get("confidence"),
            "text": result.get("text"),
            "words": result.get("words", []),
            "utterances": result.get("utterances", []),
            "candidateOnly": True,
            "transcribedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        output.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(
            f"Saved {output.relative_to(ROOT)}: {len(candidate['words'])} words; "
            f"model={candidate['modelUsed']}; confidence={candidate['confidence']}",
            flush=True,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
