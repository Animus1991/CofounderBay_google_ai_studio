# CoFounderBay: email infra, DD share files + view records, weekly digest settings/preview/send, cron webhook
import os
import time
import uuid

import pytest
import requests
from pymongo import MongoClient

from test_cofounderbay_api import BASE_URL


def _env(path, key):
    for line in open(path):
        if line.startswith(key + '='):
            return line.split('=', 1)[1].strip().strip('"')
    return None


CRON_SECRET = _env('/app/backend/.env', 'WEBHOOK_CRON_SECRET')
MONGO = MongoClient(_env('/app/backend/.env', 'MONGO_URL'))[_env('/app/backend/.env', 'DB_NAME')]
ITEMS = [{'category': 'legal', 'title': 'TEST_SAFE', 'status': 'done'}]


@pytest.fixture(scope='module')
def cid():
    c = f'TEST_{uuid.uuid4().hex[:12]}'
    yield c
    for coll in ('email_log', 'digest_settings', 'digest_snapshots', 'digests', 'dd_shares'):
        MONGO[coll].delete_many({'clientId': c})


# ── Email ──
class TestEmail:
    def test_status(self):
        r = requests.get(f'{BASE_URL}/api/email/status')
        assert r.status_code == 200
        assert r.json() == {'provider': None, 'configured': False, 'available': ['smtp']}

    def test_send_queued_and_log(self, cid):
        r = requests.post(f'{BASE_URL}/api/email/send', json={'clientId': cid, 'to': 'naval@example.com', 'subject': 'TEST_hi', 'body': 'Body', 'investorId': 'inv_1', 'investorName': 'Naval Ravikant'})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['status'] == 'queued' and 'provider' in d['detail'].lower() and '_id' not in d
        log = requests.get(f'{BASE_URL}/api/email/log', params={'clientId': cid}).json()
        assert len(log) == 1 and log[0]['to'] == 'naval@example.com' and 'body' not in log[0] and log[0]['investorName'] == 'Naval Ravikant'
        assert requests.get(f'{BASE_URL}/api/email/log', params={'clientId': cid, 'investorId': 'nope'}).json() == []

    @pytest.mark.parametrize('to', ['bad', 'a@b', 'a b@c.com', ''])
    def test_invalid_email(self, cid, to):
        r = requests.post(f'{BASE_URL}/api/email/send', json={'clientId': cid, 'to': to, 'subject': 's', 'body': 'b'})
        assert r.status_code == 422


# ── DD files + view records ──
class TestDDFiles:
    def test_files_validation_and_keep(self, cid):
        base = {'clientId': cid, 'investorName': 'TEST_Seq', 'ventureName': 'V', 'items': ITEMS}
        bad = requests.post(f'{BASE_URL}/api/dd/shares', json={**base, 'files': [{'name': 'x', 'url': 'http://x.com/a'}]})
        assert bad.status_code == 422
        bad2 = requests.post(f'{BASE_URL}/api/dd/shares', json={**base, 'files': [{'name': 'x', 'url': 'javascript:alert(1)'}]})
        assert bad2.status_code == 422
        many = requests.post(f'{BASE_URL}/api/dd/shares', json={**base, 'files': [{'name': f'f{i}', 'url': 'https://x.com'} for i in range(11)]})
        assert many.status_code == 422
        r = requests.post(f'{BASE_URL}/api/dd/shares', json={**base, 'files': [{'name': 'deck.txt', 'size': '1 KB', 'url': 'data:text/plain;base64,aGk='}]})
        assert r.status_code == 200 and r.json()['files'] == ['deck.txt']
        tok = r.json()['token']
        u = requests.put(f'{BASE_URL}/api/dd/shares/{tok}', json=base)
        assert u.status_code == 200 and u.json()['files'] == ['deck.txt']
        pub = requests.get(f'{BASE_URL}/api/dd/public/{tok}').json()
        assert pub['files'][0]['url'].startswith('data:') and 'clientId' not in pub
        assert MONGO.dd_share_views.count_documents({'token': tok}) == 1
        u2 = requests.put(f'{BASE_URL}/api/dd/shares/{tok}', json={**base, 'files': []})
        assert u2.json()['files'] == []


# ── Digest ──
class TestDigest:
    def test_preview_404_before_snapshot(self, cid):
        assert requests.get(f'{BASE_URL}/api/digest/preview', params={'clientId': cid}).status_code == 404

    def test_settings_validation(self, cid):
        assert requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'timezone': 'Mars/Base'}).status_code == 422
        assert requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'enabled': True}).status_code == 422
        assert requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'day': 7}).status_code == 422
        assert requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'hour': 24}).status_code == 422
        d = requests.get(f'{BASE_URL}/api/digest/settings', params={'clientId': cid}).json()
        assert d['enabled'] is False and d['timezone'] == 'Europe/Athens'

    def test_send_now_requires_email(self, cid):
        assert requests.post(f'{BASE_URL}/api/digest/send-now', json={'clientId': cid}).status_code in (404, 422)

    def test_snapshot_preview_send(self, cid):
        snap = {'clientId': cid, 'venture': 'TEST_V', 'round': {'target': 1000000, 'committed': 250000, 'targetLabel': '$1M', 'instrument': 'SAFE'},
                'pipeline': [{'name': 'a16z', 'stage': 'Meeting', 'nextStep': 'Send deck', 'nextDate': '2020-01-01', 'history': []},
                             {'name': 'Old', 'stage': 'Passed', 'nextDate': '2020-01-01'}],
                'dd': {'total': 5, 'done': 2, 'inProgress': 1, 'open': ['Cap table']}}
        assert requests.put(f'{BASE_URL}/api/digest/snapshot', json=snap).json() == {'saved': True}
        p = requests.get(f'{BASE_URL}/api/digest/preview', params={'clientId': cid}).json()
        for sec in ('Round: 25%', 'Pipeline: 2 tracked, 1 active', 'Moves this week', 'Overdue follow-ups', 'a16z: Send deck', 'Due in the next 7 days', 'Due diligence: 2/5'):
            assert sec in p['text'], sec
        assert 'Old' not in p['text'].split('Overdue follow-ups')[1]
        assert p['stats']['overdue'] == 1
        s = requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'enabled': True, 'email': 'me@example.com', 'day': 1, 'hour': 8, 'timezone': 'Europe/Athens', 'lang': 'en'})
        assert s.status_code == 200 and s.json()['enabled'] is True
        r = requests.post(f'{BASE_URL}/api/digest/send-now', json={'clientId': cid}).json()
        assert r['status'] == 'queued'
        h = requests.get(f'{BASE_URL}/api/digest/history', params={'clientId': cid}).json()
        assert len(h) == 1 and h[0]['status'] == 'queued' and h[0]['trigger'] == 'manual'

    def test_greek_preview(self, cid):
        requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'email': 'me@example.com', 'lang': 'el'})
        p = requests.get(f'{BASE_URL}/api/digest/preview', params={'clientId': cid}).json()
        assert 'Εβδομαδιαία' in p['text']


# ── Cron ──
class TestCron:
    def test_unauthorized(self):
        assert requests.post(f'{BASE_URL}/api/cron/digest', json={}).status_code == 401
        assert requests.post(f'{BASE_URL}/api/cron/digest', json={}, headers={'Authorization': 'Bearer wrong'}).status_code == 401

    def test_due_now_sends_once(self, cid):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        local = datetime.now(ZoneInfo('Asia/Tokyo'))
        day = (local.weekday() + 1) % 7
        requests.put(f'{BASE_URL}/api/digest/snapshot', json={'clientId': cid, 'venture': 'TEST_C', 'pipeline': []})
        requests.put(f'{BASE_URL}/api/digest/settings', json={'clientId': cid, 'enabled': True, 'email': 'me@example.com', 'day': day, 'hour': local.hour, 'timezone': 'Asia/Tokyo', 'lang': 'en'})
        before = len(requests.get(f'{BASE_URL}/api/digest/history', params={'clientId': cid}).json())
        hdr = {'Authorization': f'Bearer {CRON_SECRET}'}
        wid = f'TEST_{uuid.uuid4().hex}'
        r = requests.post(f'{BASE_URL}/api/cron/digest', json={}, headers={**hdr, 'X-Webhook-Id': wid})
        assert r.status_code == 200 and r.json() == {'accepted': True}
        dup = requests.post(f'{BASE_URL}/api/cron/digest', json={}, headers={**hdr, 'X-Webhook-Id': wid})
        assert dup.json().get('duplicate') is True
        time.sleep(3)
        h = requests.get(f'{BASE_URL}/api/digest/history', params={'clientId': cid}).json()
        assert len(h) == before + 1 and h[0]['trigger'].startswith('cron:')
        st = requests.get(f'{BASE_URL}/api/digest/settings', params={'clientId': cid}).json()
        assert st['lastSentWeek']
        requests.post(f'{BASE_URL}/api/cron/digest', json={}, headers={**hdr, 'X-Webhook-Id': f'TEST_{uuid.uuid4().hex}'})
        time.sleep(3)
        assert len(requests.get(f'{BASE_URL}/api/digest/history', params={'clientId': cid}).json()) == before + 1
