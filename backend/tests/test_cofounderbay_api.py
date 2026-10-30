# CoFounderBay backend regression: core data routes, AI proxy (Claude), AI action ledger
import json
import os
import uuid

import pytest
import requests


def _base():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    url = line.split('=', 1)[1].strip()
    return url.rstrip('/')


BASE_URL = _base()


@pytest.fixture(scope='module')
def s():
    sess = requests.Session()
    sess.headers.update({'Content-Type': 'application/json'})
    return sess


# --- Core data routes ---
class TestCore:
    def test_root(self, s):
        assert s.get(f'{BASE_URL}/api/').status_code == 200

    def test_tenants(self, s):
        r = s.get(f'{BASE_URL}/api/tenants')
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_users(self, s):
        r = s.get(f'{BASE_URL}/api/users')
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0 and all('_id' not in u for u in data)

    def test_user_1(self, s):
        r = s.get(f'{BASE_URL}/api/users/1')
        assert r.status_code == 200
        d = r.json()
        assert d['id'] == '1' and 'profile' in d and isinstance(d['skills'], list)

    def test_user_404(self, s):
        assert s.get(f'{BASE_URL}/api/users/nope-xyz').status_code == 404

    def test_matches_deterministic(self, s):
        a = s.get(f'{BASE_URL}/api/matches/1')
        b = s.get(f'{BASE_URL}/api/matches/1')
        assert a.status_code == 200 and b.status_code == 200
        assert len(a.json()) > 0
        assert [m['compatibilityDimensions'] for m in a.json()] == [m['compatibilityDimensions'] for m in b.json()]
        assert [m['score'] for m in a.json()] == sorted([m['score'] for m in a.json()], reverse=True)

    def test_mentors(self, s):
        r = s.get(f'{BASE_URL}/api/mentors')
        assert r.status_code == 200
        assert all('Mentor' in m['roles'] for m in r.json())

    def test_communities(self, s):
        r = s.get(f'{BASE_URL}/api/communities')
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_conversations(self, s):
        r = s.get(f'{BASE_URL}/api/conversations/1')
        assert r.status_code == 200
        assert any(c['id'] == 'c1' for c in r.json())
        assert 'otherParticipant' in r.json()[0]

    def test_messages_c1(self, s):
        r = s.get(f'{BASE_URL}/api/messages/c1')
        assert r.status_code == 200 and len(r.json()) > 0

    def test_conversation_create_idempotent(self, s):
        p = {'participants': ['1', 'TEST_' + uuid.uuid4().hex[:6]]}
        a = s.post(f'{BASE_URL}/api/conversations', json=p)
        b = s.post(f'{BASE_URL}/api/conversations', json=p)
        assert a.status_code == 200 and b.status_code == 200
        assert a.json()['id'] == b.json()['id']

    def test_send_message_and_mark_read(self, s):
        conv = s.post(f'{BASE_URL}/api/conversations', json={'participants': ['1', 'TEST_msg']}).json()
        r = s.post(f'{BASE_URL}/api/messages', json={'conversationId': conv['id'], 'senderId': 'TEST_msg', 'body': 'TEST_hello'})
        assert r.status_code == 200 and r.json()['body'] == 'TEST_hello'
        msgs = s.get(f'{BASE_URL}/api/messages/{conv["id"]}').json()
        assert any(m['body'] == 'TEST_hello' for m in msgs)
        mr = s.post(f'{BASE_URL}/api/messages/mark-read', json={'conversationId': conv['id'], 'userId': '1'})
        assert mr.status_code == 200 and mr.json()['success'] is True
        msgs = s.get(f'{BASE_URL}/api/messages/{conv["id"]}').json()
        assert all(m['readStatus'] for m in msgs if m['senderId'] != '1')

    def test_send_message_empty_body_422(self, s):
        r = s.post(f'{BASE_URL}/api/messages', json={'conversationId': 'c1', 'senderId': '1', 'body': ''})
        assert r.status_code == 422


# --- AI proxy ---
class TestAI:
    def test_status(self, s):
        d = s.get(f'{BASE_URL}/api/ai/status').json()
        assert d['configured'] is True and d['model'] == 'claude-opus-5-5'

    def test_missing_contents_400(self, s):
        r = s.post(f'{BASE_URL}/api/ai/generate', json={'config': {}})
        assert r.status_code == 400

    def test_tools_function_call(self, s):
        body = {
            'contents': [{'role': 'user', 'parts': [{'text': 'Mark the EIN legal item as done.'}]}],
            'config': {
                'systemInstruction': 'You are a studio operator. Always use tools when relevant.',
                'tools': [{'functionDeclarations': [{
                    'name': 'set_legal_item',
                    'description': 'Tick or untick a legal checklist item',
                    'parameters': {'type': 'OBJECT', 'properties': {
                        'item': {'type': 'STRING', 'description': 'item name'},
                        'done': {'type': 'BOOLEAN'}}, 'required': ['item']},
                }]}],
            },
        }
        r = s.post(f'{BASE_URL}/api/ai/generate', json=body, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert 'text' in d and isinstance(d['functionCalls'], list) and d['model'] == 'claude-opus-5-5'
        assert any(c['name'] == 'set_legal_item' and isinstance(c['args'], dict) for c in d['functionCalls']), d

    def test_json_mode(self, s):
        body = {'contents': 'Return an object with key "tips" being an array of 2 short strings about pitching.',
                'config': {'responseMimeType': 'application/json'}}
        r = s.post(f'{BASE_URL}/api/ai/generate', json=body, timeout=90)
        assert r.status_code == 200, r.text
        parsed = json.loads(r.json()['text'])
        assert isinstance(parsed, (dict, list))


# --- AI action ledger ---
class TestLedger:
    def test_record_and_list(self, s):
        cid = 'TEST_' + uuid.uuid4().hex[:8]
        for st in ['applied', 'applied', 'cancelled', 'undone']:
            r = s.post(f'{BASE_URL}/api/ai/actions', json={'clientId': cid, 'tool': 'set_legal_item', 'summary': 'x',
                                                            'status': st, 'reversal': 'full', 'source': 'router'})
            assert r.status_code == 200 and r.json()['status'] == st and '_id' not in r.json()
        d = s.get(f'{BASE_URL}/api/ai/actions', params={'clientId': cid}).json()
        assert len(d['items']) == 4
        assert d['counts'] == {'applied': 2, 'cancelled': 1, 'undone': 1}

    def test_invalid_status_422(self, s):
        r = s.post(f'{BASE_URL}/api/ai/actions', json={'clientId': 'TEST_abcd', 'tool': 't', 'summary': 's', 'status': 'bogus'})
        assert r.status_code == 422

    def test_invalid_source_422(self, s):
        r = s.post(f'{BASE_URL}/api/ai/actions', json={'clientId': 'TEST_abcd', 'tool': 't', 'summary': 's',
                                                        'status': 'applied', 'source': 'hacker'})
        assert r.status_code == 422


# --- Iteration 2: Fix 6 (tenant patch validation, base64 check, plain text, per-IP rate limit) ---
class TestFix6:
    def test_branding_nested_422(self, s):
        r = s.post(f'{BASE_URL}/api/tenants/t1/branding', json={'primaryColor': {'nested': 1}})
        assert r.status_code == 422

    def test_branding_list_body_422(self, s):
        r = s.post(f'{BASE_URL}/api/tenants/t1/branding', json=[1, 2])
        assert r.status_code in (400, 422)

    def test_branding_flat_200(self, s):
        r = s.post(f'{BASE_URL}/api/tenants/t1/branding', json={'primaryColor': '#111111'})
        assert r.status_code == 200
        assert r.json().get('primaryColor') == '#111111'

    def test_branding_unknown_tenant_404(self, s):
        r = s.post(f'{BASE_URL}/api/tenants/nope-xyz/branding', json={'a': 'b'})
        assert r.status_code == 404

    def test_inline_not_base64_400(self, s):
        r = s.post(f'{BASE_URL}/api/ai/generate', json={'contents': [{'role': 'user', 'parts': [
            {'text': 'hi'}, {'inlineData': {'mimeType': 'image/png', 'data': 'not base64!!'}}]}]})
        assert r.status_code == 400
        assert 'base64' in r.json().get('error', '')

    def test_plain_text_reply(self, s):
        r = s.post(f'{BASE_URL}/api/ai/generate', json={'contents': 'Give me three tips for a cold email to an angel investor. Use bold headings.'}, timeout=90)
        assert r.status_code == 200
        text = r.json()['text']
        print(text)
        assert '**' not in text
        assert not any(l.lstrip().startswith('#') for l in text.splitlines())

