

import logging
import re
from pathlib import Path

import numpy as np
from django.db import transaction

from .chunker import split_text, strip_html
from .clients import get_embedding_client
from .models import Audience, KnowledgeChunk, SourceType

logger = logging.getLogger(__name__)

CORPUS_DIR = Path(__file__).resolve().parent / 'corpus'
EMBED_BATCH_SIZE = 16

LEVEL_LABELS = {
    'beginner': ('Débutant', 'Beginner'),
    'intermediate': ('Intermédiaire', 'Intermediate'),
    'advanced': ('Avancé', 'Advanced'),
}


def _normalize(vector: list[float]) -> list[float]:
    arr = np.asarray(vector, dtype=np.float32)
    norm = float(np.linalg.norm(arr))
    if norm == 0:
        return arr.tolist()
    return (arr / norm).tolist()


def _faq_docs() -> list[dict]:
    from .models import FaqEntry

    return [
        {
            'text': f'{entry.question}\n{entry.answer}',
            'source_type': SourceType.FAQ,
            'source_id': str(entry.id),
            'title': entry.question,
            'url': '/assistant',
            'language': entry.language,
        }
        for entry in FaqEntry.objects.filter(is_published=True)
    ]


def _course_doc(course) -> dict:
    fr_level, en_level = LEVEL_LABELS.get(course.level, (course.level, course.level))
    parts = [course.title, course.summary, strip_html(course.description)]
    if course.objectives:
        parts.append('Objectifs / objectives: ' + '; '.join(course.objectives))
    if course.category:
        parts.append(f'Catégorie / category: {course.category.name}')
    parts.append(f'Niveau / level: {fr_level} ({en_level}).')
    modules = [m.title for m in course.modules.all()]
    if modules:
        parts.append('Chapitres / chapters: ' + '; '.join(modules))
    resources = [r.title for r in course.resources.all()]
    if resources:
        parts.append('Ressources / resources: ' + '; '.join(resources))
    if course.is_mandatory:
        parts.append('Cours obligatoire pour tous les employés / mandatory course.')
    return {
        'text': '\n'.join(p for p in parts if p),
        'source_type': SourceType.COURSE,
        'source_id': str(course.id),
        'title': course.title,
        'url': f'/catalog/{course.slug}',
        'language': '',  # catalog content is language-neutral: retrieved for every locale
    }


def _catalog_docs() -> list[dict]:
    from apps.courses.models import Course, Lesson

    docs = []
    courses = Course.objects.filter(is_published=True).select_related('category').prefetch_related(
        'modules', 'resources'
    )
    for course in courses:
        docs.append(_course_doc(course))
        text_lessons = Lesson.objects.filter(
            module__course=course, content_type='text'
        ).exclude(rich_text='').select_related('module')
        for lesson in text_lessons:
            docs.append({
                'text': f'{lesson.title}\n{strip_html(lesson.rich_text)}',
                'source_type': SourceType.LESSON,
                'source_id': f'{course.id}:{lesson.id}',
                'title': f'{course.title} — {lesson.title}',
                'url': f'/learn/{course.slug}',
                'language': '',
            })
    return docs


def _help_docs() -> list[dict]:
    docs = []
    if not CORPUS_DIR.is_dir():
        return docs
    for path in sorted(CORPUS_DIR.glob('*.md')):
        match = re.match(r'^(?P<slug>.+)\.(?P<lang>fr|en)$', path.stem)
        if not match:
            logger.warning('Skipping corpus file without .fr/.en suffix: %s', path.name)
            continue
        lines = path.read_text(encoding='utf-8').strip().splitlines()
        title, body_start = path.stem, 0
        if lines and lines[0].startswith('# '):
            title = lines[0][2:].strip()
            body_start = 1
        # `URL:` / `Audience:` header lines, in any order, before the body.
        headers: dict[str, str] = {}
        while body_start < len(lines):
            header = re.match(r'^(url|audience)\s*:\s*(.*)$', lines[body_start], re.IGNORECASE)
            if not header:
                break
            headers[header.group(1).lower()] = header.group(2).strip()
            body_start += 1

        audience = headers.get('audience', '').lower()
        if audience and audience not in Audience.values:
            # Fail closed: an unrecognised tag on a role guide must not silently
            # publish it to every learner.
            logger.error('Corpus file %s has unknown Audience %r — restricting to admins.',
                         path.name, audience)
            audience = Audience.ADMIN

        body = '\n'.join(lines[body_start:]).strip()
        docs.append({
            'text': f'{title}\n{body}',
            'source_type': SourceType.DOC,
            'source_id': f"{match['slug']}.{match['lang']}",
            'title': title,
            'url': headers.get('url', ''),
            'language': match['lang'],
            'audience': audience,
        })
    return docs


def collect_documents() -> list[dict]:
    return _faq_docs() + _catalog_docs() + _help_docs()


def _build_chunks(docs: list[dict], embedder=None) -> list[KnowledgeChunk]:
    embedder = embedder or get_embedding_client()
    pieces = []
    for doc in docs:
        for index, chunk_text in enumerate(split_text(doc['text'])):
            # Every document's text opens with its title, so only the continuation
            # chunks need it restored. Without it, chunk 2 of a long guide is a
            # headless paragraph: it embeds badly and reads badly when cited.
            content = chunk_text if index == 0 else f"{doc['title']}\n{chunk_text}"
            pieces.append((doc, index, content))
    rows = []
    for start in range(0, len(pieces), EMBED_BATCH_SIZE):
        batch = pieces[start:start + EMBED_BATCH_SIZE]
        vectors = embedder.embed([text for _, _, text in batch])
        for (doc, index, content), vector in zip(batch, vectors):
            rows.append(KnowledgeChunk(
                content=content,
                embedding=_normalize(vector),
                source_type=doc['source_type'],
                source_id=doc['source_id'],
                chunk_index=index,
                title=doc['title'][:255],
                url=doc['url'][:255],
                language=doc['language'],
                audience=doc.get('audience', ''),
            ))
    return rows


def rebuild_index(embedder=None) -> int:
    """Full cold rebuild: re-collect, re-embed, and atomically replace the index."""
    rows = _build_chunks(collect_documents(), embedder)
    with transaction.atomic():
        KnowledgeChunk.objects.all().delete()
        KnowledgeChunk.objects.bulk_create(rows)
    logger.info('assistant index rebuilt: %d chunks', len(rows))
    return len(rows)


def reconcile_index(embedder=None) -> dict:
    """Repair index drift cheaply, embedding only the delta.

    The re-embed signals swallow AssistantBackendError so a content save never
    fails when Ollama is down (tasks.py) — the cost is that the index silently
    loses documents. This compares what *should* be indexed against what is,
    embeds the documents that have no chunks, and drops chunks whose document is
    gone or was unpublished.

    Presence only: a document edited while the backend was down keeps its stale
    chunks, because nothing records the source's content hash. Use a full
    `rebuild_index()` to pick those up.
    """
    expected = {(doc['source_type'], doc['source_id']): doc for doc in collect_documents()}
    existing = set(KnowledgeChunk.objects.values_list('source_type', 'source_id').distinct())

    missing = [key for key in expected if key not in existing]
    orphans = [key for key in existing if key not in expected]

    rows = _build_chunks([expected[key] for key in missing], embedder) if missing else []
    with transaction.atomic():
        for source_type, source_id in orphans:
            KnowledgeChunk.objects.filter(source_type=source_type, source_id=source_id).delete()
        if rows:
            KnowledgeChunk.objects.bulk_create(rows)

    logger.info('assistant index reconciled: +%d chunks (%d documents), -%d stale documents',
                len(rows), len(missing), len(orphans))
    return {'documents_added': len(missing), 'chunks_added': len(rows),
            'documents_removed': len(orphans)}


def reindex_faq(faq_id: int, embedder=None) -> int:
    from .models import FaqEntry

    entry = FaqEntry.objects.filter(id=faq_id, is_published=True).first()
    rows = _build_chunks(_faq_docs_for(entry), embedder) if entry else []
    with transaction.atomic():
        KnowledgeChunk.objects.filter(source_type=SourceType.FAQ, source_id=str(faq_id)).delete()
        KnowledgeChunk.objects.bulk_create(rows)
    return len(rows)


def _faq_docs_for(entry) -> list[dict]:
    return [{
        'text': f'{entry.question}\n{entry.answer}',
        'source_type': SourceType.FAQ,
        'source_id': str(entry.id),
        'title': entry.question,
        'url': '/assistant',
        'language': entry.language,
    }]


def reindex_course(course_id: int, embedder=None) -> int:
    """Re-embed one course and its text lessons (or drop them if unpublished/deleted)."""
    from apps.courses.models import Course, Lesson

    course = (
        Course.objects.filter(id=course_id, is_published=True)
        .select_related('category').prefetch_related('modules', 'resources').first()
    )
    docs = []
    if course:
        docs.append(_course_doc(course))
        text_lessons = Lesson.objects.filter(
            module__course=course, content_type='text'
        ).exclude(rich_text='')
        for lesson in text_lessons:
            docs.append({
                'text': f'{lesson.title}\n{strip_html(lesson.rich_text)}',
                'source_type': SourceType.LESSON,
                'source_id': f'{course.id}:{lesson.id}',
                'title': f'{course.title} — {lesson.title}',
                'url': f'/learn/{course.slug}',
                'language': '',
            })
    rows = _build_chunks(docs, embedder)
    with transaction.atomic():
        KnowledgeChunk.objects.filter(
            source_type=SourceType.COURSE, source_id=str(course_id)
        ).delete()
        KnowledgeChunk.objects.filter(
            source_type=SourceType.LESSON, source_id__startswith=f'{course_id}:'
        ).delete()
        KnowledgeChunk.objects.bulk_create(rows)
    return len(rows)
