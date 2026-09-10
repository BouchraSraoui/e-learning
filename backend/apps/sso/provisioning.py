"""Just-in-time user provisioning from verified OIDC claims.

Security rules:
- The email claim is trusted ONLY when the IdP asserts it verified (``email_verified``
  true). Matching or creating an account off an unverified/self-asserted email is the
  "nOAuth" account-takeover class — a token carrying another user's address (e.g. an
  admin's) would otherwise resolve to that user. Unverified ⇒ hard reject.
- Role is NEVER taken from IdP claims — a newly provisioned SSO user is always ``user``;
  the application is the sole authority on authorization. Elevate roles in the admin
  console (or, later, from a deliberately mapped IdP group).
- Department is an access-control axis here (department-scoped courses), so it is NOT
  derived from a claim either — an unverified/self-service directory attribute must not
  grant content access. Admins assign departments.
- Existing accounts are matched by email and only have empty *name* fields filled in;
  managed data (role, department, active flag, learning stats) is never clobbered.
"""
from django.contrib.auth import get_user_model

from apps.accounts.models import Role

User = get_user_model()


def _split_name(claims: dict):
    given = (claims.get('given_name') or '').strip()
    family = (claims.get('family_name') or '').strip()
    if given or family:
        return given, family
    name = (claims.get('name') or '').strip()
    parts = name.split()
    if not parts:
        return '', ''
    return parts[0], ' '.join(parts[1:])


def _is_verified(value) -> bool:
    return value is True or (isinstance(value, str) and value.strip().lower() == 'true')


def match_or_provision(claims: dict) -> User:
    email = (claims.get('email') or '').strip().lower()
    if not email:
        raise ValueError('missing email claim')
    if not _is_verified(claims.get('email_verified')):
        raise ValueError('email not verified by the identity provider')

    given, family = _split_name(claims)

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User(
            email=email, first_name=given, last_name=family,
            role=Role.USER, is_active=True,
        )
        user.set_unusable_password()
        user.save()
        return user

    # Existing account: enrich only empty NAME fields; never touch role/department/
    # is_active or the denormalized stats, and never derive them from a claim.
    updates = []
    if given and not user.first_name:
        user.first_name = given
        updates.append('first_name')
    if family and not user.last_name:
        user.last_name = family
        updates.append('last_name')
    if updates:
        user.save(update_fields=updates)
    return user
