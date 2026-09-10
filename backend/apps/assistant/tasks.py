"""Async re-embed tasks keeping the RAG index fresh.

A backend outage must never break the content save that triggered the task
(Celery runs eagerly without Redis), so AssistantBackendError is logged, not
raised — `rebuild_index` catches the index up later.
"""

import logging

from celery import shared_task

from .clients import AssistantBackendError

logger = logging.getLogger(__name__)


@shared_task
def reindex_faq_task(faq_id: int):
    from .ingest import reindex_faq

    try:
        reindex_faq(faq_id)
    except AssistantBackendError as exc:
        logger.warning('FAQ %s re-embed skipped (backend down): %s', faq_id, exc)


@shared_task
def reindex_course_task(course_id: int):
    from .ingest import reindex_course

    try:
        reindex_course(course_id)
    except AssistantBackendError as exc:
        logger.warning('Course %s re-embed skipped (backend down): %s', course_id, exc)
