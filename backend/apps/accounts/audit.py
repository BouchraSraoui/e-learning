from __future__ import annotations

from .models import AuditLog


def record_audit(actor, action: str, *, target=None, target_repr: str = '', metadata: dict | None = None):
    try:
        resolved_actor = actor if getattr(actor, 'is_authenticated', False) else None
        return AuditLog.objects.create(
            actor=resolved_actor,
            action=action,
            target_type=target.__class__.__name__ if target is not None else '',
            target_id=str(getattr(target, 'pk', '') or '') if target is not None else '',
            target_repr=(target_repr or (str(target) if target is not None else ''))[:200],
            metadata=metadata or {},
        )
    except Exception:
        return None
