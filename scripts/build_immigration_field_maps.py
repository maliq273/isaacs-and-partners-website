#!/usr/bin/env python3
"""
Build a machine-readable inventory of every immigration PDF in immigrations_docs.

The output is deliberately based on the PDFs themselves, not recreated forms:
- exact AcroForm field names
- field types
- required/multiline flags where exposed
- choice options
- widget page/rectangle/export values
- SHA-256 and PDF metadata
- a conservative semantic key derived from the field name
- an answer-path placeholder only when the field name can be mapped safely

Flattened PDFs are explicitly marked as requiring coordinate mapping. We never invent
coordinates or silently guess a field location.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path("immigrations_docs")
OUT = Path("app/knowledgebase/immigration_docs/field-maps")
OUT.mkdir(parents=True, exist_ok=True)

SAFE_PATHS = {
    "surname": "identity.surname",
    "lastname": "identity.surname",
    "familyname": "identity.surname",
    "firstname": "identity.firstNames",
    "firstnames": "identity.firstNames",
    "forenames": "identity.firstNames",
    "givenname": "identity.firstNames",
    "fullname": "identity.fullName",
    "dateofbirth": "identity.dateOfBirth",
    "dob": "identity.dateOfBirth",
    "gender": "identity.gender",
    "sex": "identity.gender",
    "nationality": "identity.nationality",
    "countryofbirth": "identity.countryOfBirth",
    "placeofbirth": "identity.placeOfBirth",
    "passportnumber": "identity.passportNumber",
    "traveldocumentnumber": "identity.passportNumber",
    "passportexpiry": "identity.passportExpiry",
    "dateofexpiry": "identity.passportExpiry",
    "email": "contact.email",
    "emailaddress": "contact.email",
    "cellphone": "contact.mobile",
    "cellphonenumber": "contact.mobile",
    "mobilenumber": "contact.mobile",
    "telephone": "contact.telephone",
    "telephone number": "contact.telephone",
}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())

def semantic_key(name: str) -> str:
    n = norm(name.split(".")[-1])
    return SAFE_PATHS.get(n, f"unmapped.{n or 'field'}")

def obj(v: Any) -> Any:
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, (list, tuple)):
        return [obj(x) for x in v]
    if hasattr(v, "as_dict"):
        try:
            return obj(v.as_dict())
        except Exception:
            pass
    if hasattr(v, "get_object"):
        try:
            return obj(v.get_object())
        except Exception:
            pass
    try:
        return str(v)
    except Exception:
        return repr(v)

def field_type(field: Any) -> str:
    return field.__class__.__name__

def widget_details(reader: PdfReader, field: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        kids = field.get("/Kids")
        refs = kids if kids else [field.indirect_reference]
    except Exception:
        refs = []
    for ref in refs:
        try:
            annot = ref.get_object() if hasattr(ref, "get_object") else ref
            page_index = None
            for i, page in enumerate(reader.pages):
                try:
                    for a in page.get("/Annots", []) or []:
                        if a == ref or getattr(a, "indirect_reference", None) == ref:
                            page_index = i + 1
                            break
                except Exception:
                    continue
                if page_index:
                    break
            rect = obj(annot.get("/Rect"))
            out.append({
                "page": page_index,
                "rect": rect,
                "exportValue": obj(annot.get("/AS")),
                "annotationFlags": obj(annot.get("/F")),
                "fieldFlags": obj(annot.get("/Ff")),
            })
        except Exception:
            continue
    return out

def build(path: Path) -> dict[str, Any]:
    reader = PdfReader(str(path))
    fields = reader.get_fields() or {}
    entries = []
    mapped = {}
    unmapped = []

    for name, field in fields.items():
        ftype = field_type(field)
        required = bool(field.get("/Ff", 0) & (1 << 1))
        options = field.get("/Opt")
        entry = {
            "fieldName": str(name),
            "fieldType": ftype,
            "required": required,
            "multiline": bool(field.get("/Ff", 0) & (1 << 12)),
            "semanticKey": semantic_key(str(name)),
            "answerPath": None,
            "options": obj(options),
            "defaultValue": obj(field.get("/DV")),
            "value": obj(field.get("/V")),
            "widgets": widget_details(reader, field),
        }
        candidate = entry["semanticKey"]
        if not candidate.startswith("unmapped."):
            entry["answerPath"] = candidate
            mapped[str(name)] = candidate
        else:
            unmapped.append(str(name))
        entries.append(entry)

    page_sizes = []
    for i, page in enumerate(reader.pages, start=1):
        box = page.mediabox
        page_sizes.append({
            "page": i,
            "width": float(box.width),
            "height": float(box.height),
        })

    return {
        "source": str(path).replace("\\", "/"),
        "sha256": sha256(path),
        "pages": len(reader.pages),
        "interactiveFieldCount": len(entries),
        "flattened": len(entries) == 0,
        "requiresCoordinateMap": len(entries) == 0,
        "fieldMap": mapped,
        "unmappedFields": unmapped,
        "pageSizes": page_sizes,
        "fields": entries,
    }

def main() -> None:
    pdfs = sorted(ROOT.glob("*.pdf"))
    manifest = []
    for path in pdfs:
        data = build(path)
        out_name = path.stem + ".json"
        (OUT / out_name).write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        manifest.append({
            "file": str(path).replace("\\", "/"),
            "sha256": data["sha256"],
            "pages": data["pages"],
            "interactiveFieldCount": data["interactiveFieldCount"],
            "flattened": data["flattened"],
            "requiresCoordinateMap": data["requiresCoordinateMap"],
            "mappedFieldCount": len(data["fieldMap"]),
            "unmappedFieldCount": len(data["unmappedFields"]),
            "fieldMapFile": f"app/knowledgebase/immigration_docs/field-maps/{out_name}",
        })

    (OUT / "manifest.json").write_text(
        json.dumps({
            "generatedBy": "scripts/build_immigration_field_maps.py",
            "documentCount": len(manifest),
            "documents": manifest,
        }, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
