import json
import sys
from pathlib import Path

from docling.document_converter import DocumentConverter


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "missing_path"}))
        return 1

    source_path = Path(sys.argv[1])
    if not source_path.exists():
        print(json.dumps({"ok": False, "error": "file_not_found"}))
        return 1

    try:
        converter = DocumentConverter()
        result = converter.convert(str(source_path))
        document = result.document
        text = ""
        markdown = ""
        if hasattr(document, "export_to_text"):
            text = document.export_to_text() or ""
        if hasattr(document, "export_to_markdown"):
            markdown = document.export_to_markdown() or ""
        payload = {
            "ok": True,
            "text": text,
            "markdown": markdown,
        }
        print(json.dumps(payload))
        return 0
    except Exception as exc:  # pragma: no cover - runtime integration path
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
