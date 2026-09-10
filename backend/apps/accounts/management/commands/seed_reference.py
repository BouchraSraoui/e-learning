"""Seed ONLY the reference data a fresh install needs to be functional.

Run this once when standing up a new/empty database (see docs/ARCHITECTURE.md):

    python manage.py migrate
    python manage.py createsuperuser      # your first admin account
    python manage.py seed_reference       # badges, categories, chat rooms, FAQ

It creates:
  - the achievement-badge catalog  (REQUIRED — badges can never be awarded without it)
  - default course categories       (starting taxonomy; edit/replace in Django admin)
  - default chat rooms              (community chat is unusable with zero rooms)
  - the bilingual (FR/EN) FAQ       (powers the FAQ page + assistant fallback)

It creates NO demo users, courses, enrolments, or activity. It is idempotent —
running it again only fills in anything missing.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand

# Starting course taxonomy. Categories are optional (a course may have none) and
# can only be created via Django admin, so we seed a sensible default set.
CATEGORIES = [
    ('Commercial', 'primary', 'Selling, negotiation, and account management.'),
    ('Human Resources', 'violet', 'Onboarding, people processes, and culture.'),
    ('Internal Process', 'brand', 'Tools and workflows used across Icosnet.'),
    ('Technical', 'emerald', 'Networking, systems, and engineering skills.'),
    ('Compliance', 'amber', 'Security, data protection, and regulation.'),
    ('Soft Skills', 'rose', 'Communication, time management, and teamwork.'),
]

# Default community rooms. There is no in-app UI to create rooms, so a fresh
# install needs at least one for the community chat to be usable.
ROOMS = [
    {'slug': 'general', 'name': 'General', 'description': 'Company-wide learning chat.'},
    {'slug': 'commercial', 'name': 'Commercial', 'description': 'Sales & account teams.'},
    {'slug': 'technical', 'name': 'Technical', 'description': 'Network & engineering topics.'},
]


class Command(BaseCommand):
    help = 'Seed reference data only (badges, categories, chat rooms, FAQ) — no demo content.'

    def handle(self, *args, **options):
        from apps.community.models import ChatRoom
        from apps.courses.models import Category
        from apps.engagement.services import sync_badge_catalog

        sync_badge_catalog()
        self.stdout.write(self.style.SUCCESS('Badge catalog synced.'))

        for i, (name, accent, desc) in enumerate(CATEGORIES):
            Category.objects.get_or_create(
                name=name, defaults={'accent': accent, 'description': desc, 'order': i}
            )
        self.stdout.write(self.style.SUCCESS(f'{len(CATEGORIES)} course categories ready.'))

        for spec in ROOMS:
            ChatRoom.objects.get_or_create(slug=spec['slug'], defaults=spec)
        self.stdout.write(self.style.SUCCESS(f'{len(ROOMS)} chat rooms ready.'))

        call_command('seed_faq')

        self.stdout.write(self.style.SUCCESS('Reference data seed complete (no demo data).'))
