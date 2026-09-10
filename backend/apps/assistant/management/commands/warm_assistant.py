import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.assistant.clients import AssistantBackendError, get_embedding_client, get_llm_client


class Command(BaseCommand):
    help = (
        'Load the embedding and generation models into Ollama so the first real question '
        "doesn't pay the cold start. They then stay resident for "
        'ASSISTANT_OLLAMA_KEEP_ALIVE. Run it after starting Ollama, or before a demo.'
    )

    def handle(self, *args, **options):
        if not settings.ASSISTANT_RAG_ENABLED:
            raise CommandError('ASSISTANT_RAG_ENABLED is off — nothing to warm up.')

        for label, model, warm in (
            ('embedding', settings.ASSISTANT_EMBED_MODEL,
             lambda: get_embedding_client().embed(['warmup'])),
            ('generation', settings.ASSISTANT_LLM_MODEL,
             lambda: get_llm_client().generate('Reply with the single word OK.', 'OK')),
        ):
            started = time.monotonic()
            try:
                warm()
            except AssistantBackendError as exc:
                raise CommandError(
                    f'{exc}\nIs Ollama running at {settings.ASSISTANT_OLLAMA_URL} '
                    f'with the "{model}" model pulled?'
                ) from exc
            self.stdout.write(self.style.SUCCESS(
                f'{label} model "{model}" loaded in {time.monotonic() - started:.1f}s '
                f'(keep_alive={settings.ASSISTANT_OLLAMA_KEEP_ALIVE}).'
            ))
