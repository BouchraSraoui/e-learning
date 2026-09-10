"""Load the shipped platform content into the current database.

Run this once when standing up a fresh database (the PostgreSQL container from the
README, or any empty DATABASE_URL target):

    python manage.py migrate
    python manage.py seed_db

It loads ``backend/seed/content.json`` — the full platform content (accounts,
courses, lessons, progress, community, the assistant's FAQ + built search index) —
and then resets the database's primary-key sequences, which ``loaddata`` alone
leaves at 1 on PostgreSQL (without the reset, the first new row after seeding
crashes on a duplicate-key error). On SQLite the reset step is a no-op.

Re-running it re-applies the seed over existing rows (matched by primary key).
For reference data only (no demo content), use ``seed_reference`` instead.
"""

from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.apps import apps
from django.db import connection

DEFAULT_SEED = Path(settings.BASE_DIR) / 'seed' / 'content.json'


class Command(BaseCommand):
    help = (
        'Load seed/content.json (full platform content) into the current database '
        'and reset PK sequences so new rows insert cleanly.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'fixture',
            nargs='?',
            default=str(DEFAULT_SEED),
            help='Fixture file to load (default: seed/content.json)',
        )

    def handle(self, *args, **options):
        fixture = Path(options['fixture'])
        if not fixture.exists():
            raise CommandError(f'Seed fixture not found: {fixture}')

        call_command('loaddata', str(fixture))

        # loaddata inserts rows with their original primary keys; PostgreSQL
        # sequences are not advanced by that, so align every sequence with the
        # data. sequence_reset_sql returns [] on SQLite (nothing to do there).
        statements = connection.ops.sequence_reset_sql(no_style(), apps.get_models())
        if statements:
            with connection.cursor() as cursor:
                for statement in statements:
                    cursor.execute(statement)
        self.stdout.write(
            self.style.SUCCESS(
                f'Seed loaded from {fixture.name}; {len(statements)} sequences reset.'
            )
        )
