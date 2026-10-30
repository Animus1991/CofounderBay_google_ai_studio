# CoFounderBay due-diligence share links: create/list/update/public view/revoke + validation
import uuid

import pytest
import requests

from test_cofounderbay_api import BASE_URL

ITEMS = [
    {'category': 'corporate', 'title': 'TEST_Incorporation', 'status': 'done', 'note': 'filed'},
    {'category': 'legal', 'title': 'TEST_SAFE', 'status': 'in_progress'},
    {'category': 'financial', 'title': 'TEST_Model', 'status': 'todo'},
]


@pytest.fixture(scope='module')
def client_id():
    return f'TEST_{uuid.uuid4().hex[:12]}'


@pytest.fixture(scope='module')
def share(client_id):
    r = requests.post(f'{BASE_URL}/api/dd/shares', json={'clientId': client_id, 'investorName': 'TEST_Sequoia', 'ventureName': 'EcoFlow Systems', 'items': ITEMS})
    assert r.status_code == 200, r.text
    data = r.json()
    yield data
    requests.delete(f"{BASE_URL}/api/dd/shares/{data['token']}", params={'clientId': client_id})


class TestDDShares:
    def test_create(self, share):
        assert isinstance(share['token'], str) and len(share['token']) >= 12
        assert share['done'] == 1 and share['total'] == 3
        assert share['views'] == 0 and share['investorName'] == 'TEST_Sequoia'
        assert share['revoked'] is False
        assert 'clientId' not in share and 'items' not in share and '_id' not in share

    def test_list(self, client_id, share):
        r = requests.get(f'{BASE_URL}/api/dd/shares', params={'clientId': client_id})
        assert r.status_code == 200
        tokens = [s['token'] for s in r.json()]
        assert share['token'] in tokens

    def test_list_other_client_empty(self, share):
        r = requests.get(f'{BASE_URL}/api/dd/shares', params={'clientId': 'TEST_nobody_' + uuid.uuid4().hex[:6]})
        assert r.status_code == 200 and r.json() == []

    def test_public_and_views(self, share):
        r1 = requests.get(f"{BASE_URL}/api/dd/public/{share['token']}")
        assert r1.status_code == 200
        d1 = r1.json()
        assert 'clientId' not in d1 and '_id' not in d1
        assert d1['ventureName'] == 'EcoFlow Systems' and len(d1['items']) == 3
        assert d1['items'][0]['note'] == 'filed'
        r2 = requests.get(f"{BASE_URL}/api/dd/public/{share['token']}")
        assert r2.json()['views'] == d1['views'] + 1
        assert r2.json()['lastViewedAt']

    def test_update_same_client(self, client_id, share):
        items = [dict(i, status='done') for i in ITEMS]
        r = requests.put(f"{BASE_URL}/api/dd/shares/{share['token']}", json={'clientId': client_id, 'ventureName': 'EcoFlow Systems', 'items': items})
        assert r.status_code == 200
        assert r.json()['done'] == 3
        pub = requests.get(f"{BASE_URL}/api/dd/public/{share['token']}").json()
        assert all(i['status'] == 'done' for i in pub['items'])
        assert pub['investorName'] == 'TEST_Sequoia'

    def test_update_wrong_client_404(self, share):
        r = requests.put(f"{BASE_URL}/api/dd/shares/{share['token']}", json={'clientId': 'TEST_wrong_cl', 'items': ITEMS})
        assert r.status_code == 404

    def test_invalid_status_422(self, client_id):
        r = requests.post(f'{BASE_URL}/api/dd/shares', json={'clientId': client_id, 'items': [{'category': 'x', 'title': 'y', 'status': 'finished'}]})
        assert r.status_code == 422

    def test_short_client_422(self):
        r = requests.post(f'{BASE_URL}/api/dd/shares', json={'clientId': 'ab', 'items': []})
        assert r.status_code == 422

    def test_public_unknown_404(self):
        assert requests.get(f'{BASE_URL}/api/dd/public/doesnotexist123').status_code == 404

    def test_revoke_wrong_client_404(self, share):
        r = requests.delete(f"{BASE_URL}/api/dd/shares/{share['token']}", params={'clientId': 'TEST_wrong_cl'})
        assert r.status_code == 404

    def test_revoke_flow(self, client_id):
        r = requests.post(f'{BASE_URL}/api/dd/shares', json={'clientId': client_id, 'investorName': 'TEST_r', 'items': ITEMS})
        token = r.json()['token']
        d = requests.delete(f'{BASE_URL}/api/dd/shares/{token}', params={'clientId': client_id})
        assert d.status_code == 200 and d.json()['revoked'] is True
        assert requests.get(f'{BASE_URL}/api/dd/public/{token}').status_code == 404
        listed = [s['token'] for s in requests.get(f'{BASE_URL}/api/dd/shares', params={'clientId': client_id}).json()]
        assert token not in listed
        u = requests.put(f'{BASE_URL}/api/dd/shares/{token}', json={'clientId': client_id, 'items': ITEMS})
        assert u.status_code == 404
