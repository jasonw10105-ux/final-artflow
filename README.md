# AI Auto-Tagging for Art Images

An extensible Python service that generates intelligent tags for artwork images using:

- Zero-shot image labeling with CLIP (styles, mediums, subjects, vibes)
- OCR text extraction (signatures, labels, wall cards, certificates)
- Color palette extraction and human-friendly color naming

Outputs a ranked set of tags and structured metadata as JSON.

## Quickstart

1) Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

2) Run the CLI on a single image:

```bash
python -m ai_autotag.cli --image path/to/art.jpg --top-k 5 --num-colors 5
```

3) Or a directory of images (recursively):

```bash
python -m ai_autotag.cli --dir /path/to/folder --out results.jsonl
```

Each line of the output file is a JSON object with fields: `tags`, `clip`, `colors`, `ocr_text`, and `meta`.

## Design

- `CLIP` provides zero-shot scores across curated taxonomies (styles, mediums, subjects, moods). Prompts are templates that can be adapted to your brand voice.
- `OCR` (EasyOCR) extracts visible text; you can optionally index this for search.
- `Palette` extraction identifies dominant colors and maps them to human-readable names.
- `Pipeline` merges these signals, ranks tags by confidence, and de-duplicates.

## Configuration

- Edit `ai_autotag/taxonomy.py` to adjust or expand labels.
- You can control top-k per category, prompt templates, and color extraction params via CLI flags or by editing defaults in code.

## Notes

- Models download on first run. CPU is supported; GPU (CUDA) will be used automatically if available.
- EasyOCR downloads language packs at first use.
- For production, consider caching model weights and adding a simple HTTP server around `AutoTagger` (e.g., FastAPI).

