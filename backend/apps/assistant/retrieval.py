import numpy as np
from django.db.models import Q

from .models import Audience, KnowledgeChunk

# Everyone may retrieve untagged chunks; the per-role guides are additive on top.
PUBLIC_AUDIENCES = ['']


def audiences_for(user) -> list[str]:
    """Audience tags this user is allowed to be answered from. A learner asking
    "comment assigner un cours ?" gets the learner answer, not the manager
    procedure they have no permission to carry out."""
    if getattr(user, 'is_admin_role', False):
        return [*PUBLIC_AUDIENCES, Audience.MANAGER, Audience.ADMIN]
    if getattr(user, 'is_manager_role', False):
        return [*PUBLIC_AUDIENCES, Audience.MANAGER]
    return list(PUBLIC_AUDIENCES)


def retrieve(query_vector: list[float], language: str, k: int, threshold: float,
             audiences: list[str] | None = None) -> list[dict]:

    rows = list(
        KnowledgeChunk.objects
        .filter(Q(language='') | Q(language=language))
        .filter(audience__in=audiences if audiences is not None else PUBLIC_AUDIENCES)
        .values('id', 'content', 'title', 'url', 'embedding')
    )
    if not rows:
        return []

    query = np.asarray(query_vector, dtype=np.float32)
    norm = float(np.linalg.norm(query))
    if norm == 0:
        return []
    query = query / norm

    matrix = np.asarray([r['embedding'] for r in rows], dtype=np.float32)
    similarities = matrix @ query

    order = np.argsort(-similarities)[:k]
    return [
        {
            'id': rows[i]['id'],
            'content': rows[i]['content'],
            'title': rows[i]['title'],
            'url': rows[i]['url'],
            'similarity': float(similarities[i]),
        }
        for i in order
        if float(similarities[i]) >= threshold
    ]
