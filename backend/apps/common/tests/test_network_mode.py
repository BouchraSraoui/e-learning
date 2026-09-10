"""On-net / Off-net access-mode tests (spec 2.6.2).

Exercises both resolution paths — production client-IP-vs-CIDR detection and the
dev-only simulated-origin header — plus the status endpoint the SPA badge reads.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.network import resolve_access_mode

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(email='net.user@icosnet.demo', password='password123')


class _Req:
    """Minimal request stand-in for resolve_access_mode (reads META + GET)."""

    def __init__(self, query=None, **meta):
        self.META = meta
        self.GET = query or {}


# --- production: real client IP vs CIDR ------------------------------------

def test_prod_ip_inside_cidr_is_on_net(settings):
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    assert resolve_access_mode(_Req(REMOTE_ADDR='10.1.2.3')) == 'on_net'


def test_prod_ip_outside_cidr_is_off_net(settings):
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    assert resolve_access_mode(_Req(REMOTE_ADDR='203.0.113.7')) == 'off_net'


def test_prod_no_cidrs_fails_closed_to_off_net(settings):
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = []
    assert resolve_access_mode(_Req(REMOTE_ADDR='10.1.2.3')) == 'off_net'


def test_prod_forwarded_for_ignored_unless_trusted(settings):
    # An off-net REMOTE_ADDR with a spoofed on-net X-Forwarded-For must stay off-net
    # while the proxy header is untrusted (the default) — no header-based spoofing.
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    settings.NET_TRUST_FORWARDED_FOR = False
    req = _Req(REMOTE_ADDR='203.0.113.7', HTTP_X_FORWARDED_FOR='10.1.2.3')
    assert resolve_access_mode(req) == 'off_net'


def test_prod_forwarded_for_used_when_trusted(settings):
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    settings.NET_TRUST_FORWARDED_FOR = True
    req = _Req(REMOTE_ADDR='203.0.113.7', HTTP_X_FORWARDED_FOR='10.1.2.3, 70.0.0.1')
    assert resolve_access_mode(req) == 'on_net'


# --- demo: simulated-origin header -----------------------------------------

def test_demo_header_off_net(settings):
    settings.NET_MODE_DEMO = True
    settings.DEBUG = True
    assert resolve_access_mode(_Req(HTTP_X_ACCESS_MODE='off_net')) == 'off_net'


def test_demo_header_absent_defaults_on_net(settings):
    settings.NET_MODE_DEMO = True
    settings.DEBUG = True
    assert resolve_access_mode(_Req()) == 'on_net'


def test_demo_query_param_off_net(settings):
    # Native browser requests (iframe/video/download) can't set headers, so the demo
    # honours a ?net= query param too.
    settings.NET_MODE_DEMO = True
    settings.DEBUG = True
    assert resolve_access_mode(_Req(query={'net': 'off_net'})) == 'off_net'


def test_demo_header_beats_query(settings):
    settings.NET_MODE_DEMO = True
    settings.DEBUG = True
    req = _Req(query={'net': 'on_net'}, HTTP_X_ACCESS_MODE='off_net')
    assert resolve_access_mode(req) == 'off_net'


def test_demo_header_ignored_when_not_demo(settings):
    # Same off_net header, but demo off + on-net IP → the header is ignored entirely.
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    req = _Req(REMOTE_ADDR='10.1.2.3', HTTP_X_ACCESS_MODE='off_net')
    assert resolve_access_mode(req) == 'on_net'


# --- status endpoint -------------------------------------------------------

def test_status_requires_auth(client):
    assert client.get('/api/net/status/').status_code in (401, 403)


def test_status_reports_demo_off_net(client, user, settings):
    settings.NET_MODE_DEMO = True
    settings.DEBUG = True
    client.force_authenticate(user)
    resp = client.get('/api/net/status/', HTTP_X_ACCESS_MODE='off_net')
    assert resp.status_code == 200
    assert resp.data == {'mode': 'off_net', 'on_net': False, 'demo': True}


def test_status_reports_prod_on_net(client, user, settings):
    settings.NET_MODE_DEMO = False
    settings.DEBUG = False
    settings.NET_ONNET_CIDRS = ['10.0.0.0/8']
    client.force_authenticate(user)
    resp = client.get('/api/net/status/', REMOTE_ADDR='10.1.2.3')
    assert resp.status_code == 200
    assert resp.data == {'mode': 'on_net', 'on_net': True, 'demo': False}
