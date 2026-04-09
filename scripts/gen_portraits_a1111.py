import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _post_json(url: str, payload: dict, timeout_s: int):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = resp.read()
        return json.loads(data.decode("utf-8"))


def _stable_seed(text: str) -> int:
    s = 2166136261
    for ch in text:
        s ^= ord(ch)
        s = (s * 16777619) & 0xFFFFFFFF
    return int(s)


def _mj_style_prompt(name: str, card_id: str, rarity: str, element: str, keywords: list[str]) -> str:
    base = (
        "original character, onmyoji-inspired, ukiyo-e mixed with modern high-end game card illustration, "
        "vibrant colors, high detail, clean linework, soft ink wash, gold foil accents, dramatic rim light, "
        "full body, dynamic pose, centered composition, plain background, no text, no watermark"
    )
    elem = (
        "fire element, maple leaves, ember glow"
        if element == "火"
        else "water element, paper umbrella, flowing sleeves like water"
        if element == "水"
        else "metal element, katana, sharp highlights"
        if element == "金"
        else "wood element, sakura petals, ofuda talisman"
        if element == "木"
        else "earth element, prayer beads, grounded stance"
        if element == "土"
        else "void element, fox mask, yin-yang seal barrier"
    )
    tier = (
        "extremely ornate ceremonial kimono, intricate gold embroidery, cinematic lighting"
        if rarity == "SSR"
        else "ornate kimono details, strong lighting, polished look"
        if rarity == "SR"
        else "detailed kimono, soft lighting"
        if rarity == "R"
        else "simple kimono, clean design"
    )
    mood = ", ".join([k for k in keywords[:2] if k])
    return f"{name} ({card_id}), {elem}, {tier}, mood: {mood}, {base}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=os.environ.get("A1111_API", "http://127.0.0.1:7860"))
    ap.add_argument("--out", default="src/assets/portraits")
    ap.add_argument("--cards", default="src/data/cards.json")
    ap.add_argument("--width", type=int, default=768)
    ap.add_argument("--height", type=int, default=1104)
    ap.add_argument("--steps", type=int, default=28)
    ap.add_argument("--cfg", type=float, default=6.5)
    ap.add_argument("--sampler", default="DPM++ 2M Karras")
    ap.add_argument("--timeout", type=int, default=180)
    ap.add_argument("--skip-existing", action="store_true", default=True)
    ap.add_argument("--no-skip-existing", dest="skip_existing", action="store_false")
    ap.add_argument("--sleep", type=float, default=0.2)
    args = ap.parse_args()

    cards_path = Path(args.cards).resolve()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    cards = _read_json(cards_path)
    if not isinstance(cards, list):
        raise SystemExit("cards.json format invalid")

    endpoint = args.api.rstrip("/") + "/sdapi/v1/txt2img"
    neg = (
        "text, watermark, logo, lowres, blurry, jpeg artifacts, extra limbs, extra fingers, bad hands, "
        "deformed, cropped, out of frame, nsfw"
    )

    ok = 0
    skipped = 0
    failed = 0

    for i, c in enumerate(cards):
        card_id = str(c.get("id", ""))
        name = str(c.get("name", card_id))
        rarity = str(c.get("rarity", "N"))
        element = str(c.get("element", "空"))
        keywords = c.get("keywords", [])
        if not card_id:
            continue

        out_png = out_dir / f"{card_id}.png"
        out_webp = out_dir / f"{card_id}.webp"
        if args.skip_existing and (out_png.exists() or out_webp.exists()):
            skipped += 1
            continue

        prompt = _mj_style_prompt(name, card_id, rarity, element, keywords if isinstance(keywords, list) else [])
        payload = {
            "prompt": prompt,
            "negative_prompt": neg,
            "steps": args.steps,
            "cfg_scale": args.cfg,
            "width": args.width,
            "height": args.height,
            "sampler_name": args.sampler,
            "seed": _stable_seed(card_id),
            "batch_size": 1,
            "n_iter": 1,
        }

        sys.stdout.write(f"[{i+1}/{len(cards)}] {card_id} ")
        sys.stdout.flush()

        try:
            resp = _post_json(endpoint, payload, args.timeout)
            images = resp.get("images", [])
            if not images:
                raise RuntimeError("no images in response")
            img_b64 = images[0]
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            data = base64.b64decode(img_b64)
            out_png.write_bytes(data)
            ok += 1
            sys.stdout.write("OK\n")
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, ValueError) as e:
            failed += 1
            sys.stdout.write(f"FAIL ({e})\n")

        time.sleep(max(0.0, args.sleep))

    sys.stdout.write(f"done: ok={ok} skipped={skipped} failed={failed}\n")


if __name__ == "__main__":
    main()

