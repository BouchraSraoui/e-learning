"""Plain-text normalization + chunking for the RAG corpus.

Sizes are in characters. Splits respect paragraph boundaries and carry a small
overlap so an answer straddling a cut survives retrieval.

The window is deliberately much smaller than the 500-800 tokens sketched in
docs/PHASE-7-RAG.md §4.1. Every corpus document is written as self-contained
paragraphs, one task each, so ~1000 chars lands close to one topic per chunk.
That is better on both axes that the client complained about: retrieval returns
the paragraph that answers the question instead of a page-sized blob that
happens to contain it, and the prompt shrinks, which is what actually costs
seconds of prefill on a CPU-only box.
"""

import re

import nh3

MAX_CHARS = 1000
OVERLAP_CHARS = 120


def strip_html(text: str) -> str:
    """Reduce sanitized HTML (course descriptions, rich-text lessons) to plain text."""
    plain = nh3.clean(text or '', tags=set())
    return re.sub(r'[ \t]+', ' ', plain).strip()


def split_text(text: str, max_chars: int = MAX_CHARS, overlap: int = OVERLAP_CHARS) -> list[str]:
    text = (text or '').strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    chunks: list[str] = []
    current = ''
    for para in paragraphs:
        # A single paragraph larger than the window gets hard-split on sentences.
        if len(para) > max_chars:
            if current:
                chunks.append(current)
                current = ''
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sentence in sentences:
                if current and len(current) + len(sentence) + 1 > max_chars:
                    chunks.append(current)
                    current = current[-overlap:]
                current = f'{current} {sentence}'.strip()
            continue
        if current and len(current) + len(para) + 2 > max_chars:
            chunks.append(current)
            current = current[-overlap:]
        current = f'{current}\n\n{para}'.strip() if current else para
    if current:
        chunks.append(current)
    return chunks
