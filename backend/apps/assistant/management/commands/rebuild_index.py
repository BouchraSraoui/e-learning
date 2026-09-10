from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.assistant.clients import AssistantBackendError
from apps.assistant.ingest import reconcile_index, rebuild_index


class Command(BaseCommand):
    help = (
        'Re-collect, re-embed and replace the assistant RAG index (FAQ + catalog + help docs). '
        'With --reconcile, only index documents that are missing and drop chunks whose source '
        'is gone — far cheaper, and enough to repair the drift left behind when a re-embed '
        'signal fired while Ollama was down.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reconcile',
            action='store_true',
            help='Index only the delta instead of rebuilding everything from scratch.',
        )

    def handle(self, *args, **options):
        if not settings.ASSISTANT_RAG_ENABLED:
            raise CommandError('ASSISTANT_RAG_ENABLED is off — nothing to build.')
        try:
            if options['reconcile']:
                result = reconcile_index()
            else:
                count = rebuild_index()
        except AssistantBackendError as exc:
            raise CommandError(
                f'{exc}\nIs Ollama running with the "{settings.ASSISTANT_EMBED_MODEL}" model pulled?'
            ) from exc

        if options['reconcile']:
            self.stdout.write(self.style.SUCCESS(
                f'Assistant index reconciled: {result["documents_added"]} document(s) indexed '
                f'({result["chunks_added"]} chunks), {result["documents_removed"]} stale '
                f'document(s) dropped.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(f'Assistant index rebuilt: {count} chunks.'))
