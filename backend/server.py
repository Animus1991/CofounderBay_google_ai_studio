from fastapi import FastAPI, APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
from datetime import datetime, timezone
import os
import re
import json
import time
import uuid
import hmac
from datetime import timedelta
from zoneinfo import ZoneInfo
import secrets
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # noqa: E402
from email_service import active_provider, provider_status  # noqa: E402

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

AI_PROVIDER = os.environ.get('AI_PROVIDER', 'anthropic')
AI_MODEL = os.environ.get('AI_MODEL', 'claude-opus-5-5')
AI_RATE_LIMIT = int(os.environ.get('AI_RATE_LIMIT_PER_MINUTE', '30'))
TRUSTED_PROXY_HOPS = int(os.environ.get('TRUSTED_PROXY_HOPS', '2'))

app = FastAPI(title='CoFounderBay API')
api = APIRouter(prefix='/api')
logger = logging.getLogger('cofounderbay')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s %(message)s')

NO_ID = {'_id': 0}
SEED_COLLECTIONS = {
    'users': 'users', 'profiles': 'profiles', 'skills': 'skills', 'userSkills': 'user_skills',
    'communities': 'communities', 'posts': 'posts', 'tenants': 'tenants',
    'conversations': 'conversations', 'messages': 'messages',
}
AI_AGENTS = {
    'a1': 'Cofounder Matcher', 'a2': 'Pitch Deck Reviewer', 'a3': 'AI Startup Advisor', 'a4': 'Market Analyst',
    'a5': 'Fundraising Expert', 'a6': 'Legal Advisor', 'a7': 'Technical Advisor', 'a8': 'Growth Strategist',
    'a9': 'Research Assistant', 'a10': 'Mentor Finder',
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.on_event('startup')
async def seed():
    data = json.loads((ROOT_DIR / 'seed.json').read_text())
    for key, coll in SEED_COLLECTIONS.items():
        if await db[coll].count_documents({}) == 0 and data.get(key):
            await db[coll].insert_many([dict(doc) for doc in data[key]])
    await db.ai_actions.create_index([('clientId', 1), ('at', -1)])
    await db.ai_usage.create_index([('at', -1)])
    await db.dd_shares.create_index('token', unique=True)
    await db.dd_shares.create_index([('clientId', 1), ('createdAt', -1)])
    await db.email_log.create_index([('clientId', 1), ('at', -1)])
    await db.digest_settings.create_index('clientId', unique=True)
    await db.digest_snapshots.create_index('clientId', unique=True)
    logger.info('seed check complete')


async def find_all(coll: str, query: Optional[dict] = None) -> List[dict]:
    return await db[coll].find(query or {}, NO_ID).to_list(1000)


# ── Health ────────────────────────────────────────────────────────────────────
@api.get('/')
async def root():
    return {'service': 'cofounderbay', 'status': 'ok', 'time': now_iso()}


# ── Tenants ───────────────────────────────────────────────────────────────────
@api.get('/tenants')
async def list_tenants():
    return await find_all('tenants')


@api.get('/tenants/{slug}')
async def get_tenant(slug: str):
    tenant = await db.tenants.find_one({'slug': slug}, NO_ID)
    if not tenant:
        raise HTTPException(404, 'Tenant not found')
    return tenant


TenantValue = Union[str, int, float, bool, None]


async def json_object(request: Request) -> dict:
    try:
        body = await request.json()
    except ValueError:
        raise HTTPException(400, 'Body must be JSON')
    if not isinstance(body, dict):
        raise HTTPException(400, 'Body must be a JSON object')
    return body


def check_patch(body: Any) -> Dict[str, TenantValue]:
    if not isinstance(body, dict) or len(body) > 50:
        raise HTTPException(422, 'Expected an object with at most 50 fields')
    for key, value in body.items():
        if not isinstance(key, str) or len(key) > 60 or not (value is None or isinstance(value, (str, int, float, bool))):
            raise HTTPException(422, f'Invalid field: {key}')
        if isinstance(value, str) and len(value) > 2000:
            raise HTTPException(422, f'Field too long: {key}')
    return body


async def patch_tenant(tenant_id: str, field: str, body: dict) -> dict:
    body = check_patch(body)
    tenant = await db.tenants.find_one({'id': tenant_id}, NO_ID)
    if not tenant:
        raise HTTPException(404, 'Tenant not found')
    merged = {**(tenant.get(field) or {}), **body}
    await db.tenants.update_one({'id': tenant_id}, {'$set': {field: merged, 'updatedAt': now_iso()}})
    return merged


@api.post('/tenants/{tenant_id}/branding')
async def tenant_branding(tenant_id: str, request: Request):
    return await patch_tenant(tenant_id, 'branding', await json_object(request))


@api.post('/tenants/{tenant_id}/content')
async def tenant_content(tenant_id: str, request: Request):
    return await patch_tenant(tenant_id, 'content', await json_object(request))


# ── Users, matches, mentors, communities ──────────────────────────────────────
@api.get('/users')
async def list_users():
    return await find_all('users')


@api.get('/users/{user_id}')
async def get_user(user_id: str):
    user = await db.users.find_one({'id': user_id}, NO_ID)
    if not user:
        raise HTTPException(404, 'User not found')
    profile = await db.profiles.find_one({'userId': user_id}, NO_ID)
    skills = {s['id']: s for s in await find_all('skills')}
    user_skills = [{**us, **skills.get(us['skillId'], {})} for us in await find_all('user_skills', {'userId': user_id})]
    return {**user, 'profile': profile, 'skills': user_skills}


def has_category(user_skills: List[dict], skills: Dict[str, dict], category: str) -> bool:
    return any(skills.get(us['skillId'], {}).get('category') == category for us in user_skills)


@api.get('/matches/{user_id}')
async def get_matches(user_id: str):
    users = await find_all('users')
    profiles = {p['userId']: p for p in await find_all('profiles')}
    skills = {s['id']: s for s in await find_all('skills')}
    all_us = await find_all('user_skills')
    user = next((u for u in users if u['id'] == user_id), None)
    me = profiles.get(user_id)
    if not user or not me:
        raise HTTPException(404, 'User not found')
    mine = [us for us in all_us if us['userId'] == user_id]
    out = []
    for other in users:
        if other['id'] == user_id or 'Mentor' in other.get('roles', []) or other['id'] not in profiles:
            continue
        theirs_p = profiles[other['id']]
        theirs = [us for us in all_us if us['userId'] == other['id']]
        score, reasons = 50, []
        complementary = ('Founder' in user['roles'] and 'Co-Founder Candidate' in other['roles']) or (
            'Co-Founder Candidate' in user['roles'] and 'Founder' in other['roles'])
        if complementary:
            score += 20
            reasons.append('Complementary roles (Founder + Candidate)')
        shared_interests = [i for i in (me.get('interests') or []) if i in (theirs_p.get('interests') or [])]
        if shared_interests:
            score += 10 * len(shared_interests)
            reasons.append(f"Shared interests in {', '.join(shared_interests)}")
        skill_mix = (has_category(mine, skills, 'Business') and has_category(theirs, skills, 'Technical')) or (
            has_category(mine, skills, 'Technical') and has_category(theirs, skills, 'Business'))
        if skill_mix:
            score += 15
            reasons.append('Strong skill complementarity (Business + Technical)')
        their_ids = {us['skillId'] for us in theirs}
        shared_skills = [skills[us['skillId']]['name'] for us in mine if us['skillId'] in their_ids and us['skillId'] in skills]
        same_commit = me.get('commitmentLevel') == theirs_p.get('commitmentLevel')
        # Deterministic dimensions (the Node mock used random numbers, which changed on every refresh).
        dims = {
            'skills': 90 if skill_mix else 76,
            'values': min(95, 75 + 8 * len(shared_interests)),
            'goals': 92 if complementary else 78,
            'availability': 90 if same_commit else 74,
        }
        out.append({
            'id': f'm-{user_id}-{other["id"]}',
            'otherUser': {**other, 'profile': theirs_p},
            'score': min(score, 98),
            'sharedSkills': shared_skills,
            'sharedInterests': shared_interests,
            'scoreExplanation': ('. '.join(reasons) + '.') if reasons else 'Good overall alignment in goals and commitment.',
            'compatibilityDimensions': dims,
            'dimensionExplanations': {
                'skills': 'Strong synergy between business leadership and technical execution capabilities.' if skill_mix
                else 'Solid overlap in core domain expertise and technical background.',
                'values': f"Aligned interests in {' and '.join(shared_interests[:2])} suggest a shared vision for the product's impact."
                if shared_interests else 'Consistent commitment levels and startup stage preferences indicate strong cultural alignment.',
                'goals': 'Perfectly complementary roles for a balanced founding team structure.' if complementary
                else 'Potential for collaborative leadership based on shared professional seniority.',
                'availability': f"Both are looking for {me.get('commitmentLevel')} commitment, ensuring synchronized progress."
                if same_commit else 'Different commitment levels may require careful scheduling but offer flexibility for the venture.',
            },
        })
    out.sort(key=lambda m: m['score'], reverse=True)
    return out[:4]


@api.get('/communities')
async def list_communities():
    return await find_all('communities')


@api.get('/communities/{community_id}/posts')
async def community_posts(community_id: str):
    users = {u['id']: u for u in await find_all('users')}
    return [{**p, 'author': users.get(p.get('authorId'))} for p in await find_all('posts', {'communityId': community_id})]


@api.get('/mentors')
async def list_mentors():
    profiles = {p['userId']: p for p in await find_all('profiles')}
    return [{**m, 'profile': profiles.get(m['id'])} for m in await find_all('users', {'roles': 'Mentor'})]


# ── Conversations & messages ──────────────────────────────────────────────────
@api.get('/conversations/{user_id}')
async def list_conversations(user_id: str):
    users = {u['id']: u for u in await find_all('users')}
    profiles = {p['userId']: p for p in await find_all('profiles')}
    out = []
    for conv in await find_all('conversations', {'participants': user_id}):
        other_id = next((p for p in conv['participants'] if p != user_id), None)
        if other_id and other_id.startswith('a'):
            other = {'id': other_id, 'fullName': AI_AGENTS.get(other_id, 'AI Assistant'), 'roles': ['AI Assistant'], 'isAI': True}
            other_profile = {'profilePhoto': f'https://picsum.photos/seed/{other_id}/100/100', 'headline': 'AI-Powered Strategy & Insights'}
        else:
            other, other_profile = users.get(other_id) or {}, profiles.get(other_id)
        msgs = sorted(await find_all('messages', {'conversationId': conv['id']}), key=lambda m: m['createdAt'], reverse=True)
        last = msgs[0] if msgs else None
        ts = datetime.fromisoformat(last['createdAt'].replace('Z', '+00:00')) if last else None
        out.append({
            **conv,
            'otherParticipant': {**other, 'profile': other_profile},
            'lastMessage': last['body'] if last else 'No messages yet',
            'lastMessageTime': ts.strftime('%H:%M') if ts else '',
            'lastMessageTimestamp': int(ts.timestamp() * 1000) if ts else 0,
            'unreadCount': sum(1 for m in msgs if m['senderId'] != user_id and not m.get('readStatus')),
        })
    out.sort(key=lambda c: c['lastMessageTimestamp'], reverse=True)
    return out


class ConversationIn(BaseModel):
    participants: List[str]


@api.post('/conversations')
async def create_conversation(body: ConversationIn):
    parts = sorted(set(body.participants))
    existing = await db.conversations.find_one({'participants': {'$all': parts, '$size': len(parts)}}, NO_ID)
    if existing:
        return existing
    conv = {'id': f'c-{uuid.uuid4().hex[:8]}', 'participants': parts, 'status': 'Active', 'createdAt': now_iso()}
    await db.conversations.insert_one(dict(conv))
    return conv


@api.get('/messages/{conversation_id}')
async def list_messages(conversation_id: str):
    return sorted(await find_all('messages', {'conversationId': conversation_id}), key=lambda m: m['createdAt'])


class MessageIn(BaseModel):
    conversationId: str
    senderId: str
    body: str = Field(min_length=1, max_length=4000)


@api.post('/messages')
async def send_message(body: MessageIn):
    msg = {'id': f'm-{uuid.uuid4().hex[:10]}', **body.model_dump(), 'createdAt': now_iso(), 'readStatus': False}
    await db.messages.insert_one(dict(msg))
    return msg


class MarkReadIn(BaseModel):
    conversationId: str
    userId: str


@api.post('/messages/mark-read')
async def mark_read(body: MarkReadIn):
    await db.messages.update_many({'conversationId': body.conversationId, 'senderId': {'$ne': body.userId}}, {'$set': {'readStatus': True}})
    return {'success': True}


# ── AI proxy (Gemini-shaped request → Claude) ─────────────────────────────────
_buckets: Dict[str, Dict[str, float]] = {}


def caller_key(request: Request) -> str:
    """Per client IP: the entry just before the trusted proxy hops; client-sent entries and bearer tokens are ignored."""
    hops = [h.strip() for h in request.headers.get('x-forwarded-for', '').split(',') if h.strip()]
    index = len(hops) - TRUSTED_PROXY_HOPS - 1
    if index >= 0:
        return hops[index]
    return hops[0] if hops else (request.client.host if request.client else 'unknown')


def rate_limited(key: str) -> Optional[int]:
    now = time.time()
    if len(_buckets) > 5000:
        for stale in [k for k, b in _buckets.items() if b['reset'] < now]:
            _buckets.pop(stale, None)
    bucket = _buckets.get(key)
    if not bucket or bucket['reset'] < now:
        _buckets[key] = {'count': 1, 'reset': now + 60}
        return None
    bucket['count'] += 1
    return int((bucket['reset'] - now) * 1000) if bucket['count'] > AI_RATE_LIMIT else None


def schema_to_json(schema: Any) -> Any:
    """Gemini schemas use upper-case types ('OBJECT'); JSON Schema wants lower-case."""
    if isinstance(schema, dict):
        out = {}
        for k, v in schema.items():
            out[k] = v.lower() if k == 'type' and isinstance(v, str) else schema_to_json(v)
        return out
    if isinstance(schema, list):
        return [schema_to_json(v) for v in schema]
    return schema


def text_of(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        if 'parts' in value:
            return '\n'.join(p.get('text', '') for p in value['parts'] if isinstance(p, dict))
        return value.get('text', '')
    if isinstance(value, list):
        return '\n'.join(text_of(v) for v in value)
    return str(value)


def split_contents(contents: Any):
    """Returns (prompt_text, [base64 images]) — earlier turns are folded into a transcript."""
    if isinstance(contents, str):
        return contents, []
    turns = contents if isinstance(contents, list) else [contents]
    lines, images = [], []
    for turn in turns:
        if isinstance(turn, str):
            lines.append(turn)
            continue
        role = turn.get('role', 'user') if isinstance(turn, dict) else 'user'
        parts = turn.get('parts', []) if isinstance(turn, dict) else []
        if isinstance(turn, dict) and 'text' in turn and not parts:
            parts = [turn]
        texts = []
        for part in parts:
            if not isinstance(part, dict):
                continue
            if part.get('text'):
                texts.append(part['text'])
            inline = part.get('inlineData') or part.get('inline_data')
            if inline and inline.get('data'):
                images.append(inline['data'].split(',')[-1])
        body = '\n'.join(texts)
        lines.append(body if len(turns) == 1 else f"{'Assistant' if role == 'model' else 'User'}: {body}")
    return '\n\n'.join(lines), images


def plain_text(text: str) -> str:
    """The chat renders plain text: drop Markdown emphasis/headings, keep line breaks and bullets."""
    text = re.sub(r'\*\*(.+?)\*\*|__(.+?)__', lambda m: m.group(1) or m.group(2), text)
    text = re.sub(r'(?m)^#{1,6}\s+', '', text)
    text = re.sub(r'(?m)^\s*[*-]\s+', '• ', text)
    return re.sub(r'`([^`]+)`', r'\1', text).strip()


def strip_fences(text: str) -> str:
    match = re.search(r'```(?:json)?\s*(.*?)```', text, re.S)
    return (match.group(1) if match else text).strip()


async def log_usage(model: str, ok: bool, ms: int, tools: int, calls: int):
    await db.ai_usage.insert_one({'at': now_iso(), 'model': model, 'ok': ok, 'ms': ms, 'toolsOffered': tools, 'toolCalls': calls})


@api.get('/ai/status')
async def ai_status():
    configured = bool(os.environ.get('EMERGENT_LLM_KEY'))
    return {'configured': configured, 'model': AI_MODEL if configured else None, 'provider': AI_PROVIDER}


@api.post('/ai/generate')
async def ai_generate(request: Request):
    retry = rate_limited(caller_key(request))
    if retry is not None:
        return JSONResponse({'error': 'Rate limit exceeded', 'retryAfterMs': retry}, status_code=429)
    key = os.environ.get('EMERGENT_LLM_KEY')
    if not key:
        return JSONResponse({'error': 'AI proxy not configured'}, status_code=503)
    body = await json_object(request)
    if body.get('contents') is None:
        return JSONResponse({'error': '`contents` is required'}, status_code=400)
    config = body.get('config') or {}
    system = text_of(config.get('systemInstruction')) or 'You are the CoFounderBay studio assistant.'
    json_mode = config.get('responseMimeType') == 'application/json'
    if json_mode:
        system += '\n\nRespond with valid JSON only — no prose, no code fences.'
        if config.get('responseSchema'):
            system += f"\nThe JSON must match this schema: {json.dumps(schema_to_json(config['responseSchema']))}"
    if not json_mode:
        system += '\n\nThe reply is shown as plain text: write without Markdown symbols, use "• " for list items, and never comment on formatting.'
    declarations = []
    for tool in config.get('tools') or []:
        declarations.extend(tool.get('functionDeclarations') or [])
    prompt, images = split_contents(body['contents'])
    if any(not re.fullmatch(r'[A-Za-z0-9+/=\s]+', i) for i in images):
        return JSONResponse({'error': 'inlineData.data must be base64'}, status_code=400)
    chat = LlmChat(api_key=key, session_id=f'gen-{uuid.uuid4().hex}', system_message=system).with_model(AI_PROVIDER, AI_MODEL)
    params: Dict[str, Any] = {}
    if config.get('maxOutputTokens'):
        params['max_tokens'] = min(int(config['maxOutputTokens']), 4096)
    if params:
        chat = chat.with_params(**params)
    message = UserMessage(text=prompt or ' ', file_contents=[ImageContent(image_base64=i) for i in images] or None)
    started = time.time()
    try:
        if declarations:
            tools = [{'type': 'function', 'function': {
                'name': d['name'], 'description': d.get('description', ''),
                'parameters': schema_to_json(d.get('parameters') or {'type': 'OBJECT', 'properties': {}}),
            }} for d in declarations if d.get('name')]
            response = await chat.with_tools(tools, tool_choice='auto').send_message_with_tools(message)
            text = response.content or ''
            calls = [{'name': tc.name, 'args': tc.arguments or {}} for tc in (response.tool_calls or [])]
        else:
            text, calls = await chat.send_message(message), []
        text = strip_fences(text) if json_mode else plain_text(text)
        await log_usage(AI_MODEL, True, int((time.time() - started) * 1000), len(declarations), len(calls))
        return {'text': text, 'functionCalls': calls, 'model': AI_MODEL}
    except Exception as err:  # upstream provider failure
        logger.exception('AI upstream error: %s', err)
        await log_usage(AI_MODEL, False, int((time.time() - started) * 1000), len(declarations), 0)
        return JSONResponse({'error': 'Upstream AI provider error'}, status_code=502)


# ── AI action ledger: every proposal the assistant made and what happened to it ──
class AIActionIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)
    tool: str = Field(max_length=60)
    summary: str = Field(max_length=600)
    status: str = Field(pattern='^(applied|undone|cancelled|failed)$')
    reversal: Optional[str] = Field(default=None, pattern='^(full|partial|none)$')
    source: str = Field(default='router', pattern='^(router|model)$')
    path: Optional[str] = Field(default=None, max_length=120)


@api.post('/ai/actions')
async def record_action(body: AIActionIn):
    doc = {'id': uuid.uuid4().hex, **body.model_dump(), 'at': now_iso()}
    await db.ai_actions.insert_one(dict(doc))
    return doc


@api.get('/ai/actions')
async def list_actions(clientId: str, limit: int = 30):
    items = await db.ai_actions.find({'clientId': clientId}, NO_ID).sort('at', -1).to_list(max(1, min(limit, 100)))
    counts: Dict[str, int] = {}
    for item in await db.ai_actions.find({'clientId': clientId}, {'_id': 0, 'status': 1}).to_list(5000):
        counts[item['status']] = counts.get(item['status'], 0) + 1
    return {'items': items, 'counts': counts}


# ── Due-diligence share links: a read-only snapshot an investor can open without an account ──
class DDShareItem(BaseModel):
    category: str = Field(max_length=40)
    title: str = Field(max_length=160)
    status: str = Field(pattern='^(todo|in_progress|done)$')
    note: Optional[str] = Field(default=None, max_length=500)


class DDShareFile(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    size: str = Field(default='', max_length=40)
    url: str = Field(max_length=2_000_000, pattern=r'^(https://|data:)')


class DDShareIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)
    investorName: str = Field(default='', max_length=120)
    ventureName: str = Field(default='', max_length=120)
    items: List[DDShareItem] = Field(max_length=80)
    # None on update = keep the files already attached to the link.
    files: Optional[List[DDShareFile]] = Field(default=None, max_length=10)


def share_view(doc: dict) -> dict:
    return {k: doc.get(k) for k in ('token', 'investorName', 'ventureName', 'views', 'lastViewedAt', 'createdAt', 'updatedAt', 'revoked')} | {
        'done': sum(1 for i in doc.get('items', []) if i['status'] == 'done'), 'total': len(doc.get('items', [])),
        'files': [f['name'] for f in doc.get('files') or []]}


@api.post('/dd/shares')
async def create_dd_share(body: DDShareIn):
    at = now_iso()
    doc = {'token': secrets.token_urlsafe(12), **body.model_dump(), 'files': [f.model_dump() for f in body.files or []], 'views': 0, 'lastViewedAt': None, 'createdAt': at, 'updatedAt': at, 'revoked': False}
    await db.dd_shares.insert_one(dict(doc))
    return share_view(doc)


@api.put('/dd/shares/{token}')
async def update_dd_share(token: str, body: DDShareIn):
    res = await db.dd_shares.find_one_and_update(
        {'token': token, 'clientId': body.clientId, 'revoked': False},
        {'$set': {'items': [i.model_dump() for i in body.items], 'ventureName': body.ventureName, 'updatedAt': now_iso(),
                  **({'files': [f.model_dump() for f in body.files]} if body.files is not None else {})}},
        projection=NO_ID, return_document=True)
    if not res:
        raise HTTPException(404, 'Share not found')
    return share_view(res)


@api.get('/dd/shares')
async def list_dd_shares(clientId: str):
    docs = await db.dd_shares.find({'clientId': clientId, 'revoked': False}, NO_ID).sort('createdAt', -1).to_list(50)
    return [share_view(d) for d in docs]


@api.delete('/dd/shares/{token}')
async def revoke_dd_share(token: str, clientId: str):
    res = await db.dd_shares.update_one({'token': token, 'clientId': clientId, 'revoked': False}, {'$set': {'revoked': True, 'updatedAt': now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, 'Share not found')
    return {'revoked': True}


@api.get('/dd/public/{token}')
async def public_dd_share(token: str):
    doc = await db.dd_shares.find_one_and_update(
        {'token': token, 'revoked': False},
        {'$inc': {'views': 1}, '$set': {'lastViewedAt': now_iso()}},
        projection={'_id': 0, 'clientId': 0}, return_document=True)
    if not doc:
        raise HTTPException(404, 'This link is no longer available')
    await db.dd_share_views.insert_one({'token': token, 'at': doc['lastViewedAt']})
    return doc


# ── Email: provider-agnostic send + a log the CRM and the digest read ─────────
EMAIL_RE = r'^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$'


class EmailIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)
    to: str = Field(pattern=EMAIL_RE, max_length=254)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    replyTo: Optional[str] = Field(default=None, pattern=EMAIL_RE, max_length=254)
    investorId: Optional[str] = Field(default=None, max_length=80)
    investorName: Optional[str] = Field(default=None, max_length=120)


async def deliver(client_id: str, to: str, subject: str, body: str, kind: str, reply_to: Optional[str] = None, **meta) -> dict:
    provider = active_provider()
    entry = {'id': uuid.uuid4().hex, 'clientId': client_id, 'to': to, 'subject': subject, 'body': body, 'kind': kind,
             'provider': provider.name if provider else None, 'at': now_iso(), **meta}
    if not provider:
        entry.update(status='queued', detail='No email provider configured — logged, not sent.')
    else:
        try:
            entry.update(status='sent', messageId=await provider.send(to, subject, body, reply_to))
        except Exception as err:  # provider failure is reported, never raised
            logger.warning('email send failed: %s', err)
            entry.update(status='failed', detail='The email provider rejected the message.')
    await db.email_log.insert_one(dict(entry))
    entry.pop('_id', None)
    return entry


@api.get('/email/status')
async def email_status():
    return provider_status()


@api.post('/email/send')
async def email_send(body: EmailIn):
    return await deliver(body.clientId, body.to, body.subject, body.body, 'investor', body.replyTo,
                         investorId=body.investorId, investorName=body.investorName)


@api.get('/email/log')
async def email_log(clientId: str, investorId: Optional[str] = None, limit: int = 50):
    query = {'clientId': clientId, **({'investorId': investorId} if investorId else {})}
    return await db.email_log.find(query, {'_id': 0, 'body': 0}).sort('at', -1).to_list(max(1, min(limit, 200)))


# ── Weekly investor digest ───────────────────────────────────────────────────
class DigestSettingsIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)
    enabled: bool = False
    day: int = Field(default=1, ge=0, le=6)  # 0 = Sunday … 6 = Saturday
    hour: int = Field(default=8, ge=0, le=23)
    timezone: str = Field(default='Europe/Athens', max_length=60)
    email: Optional[str] = Field(default=None, pattern=EMAIL_RE, max_length=254)
    lang: str = Field(default='en', pattern='^(en|el)$')


class DigestInvestor(BaseModel):
    name: str = Field(max_length=120)
    stage: str = Field(max_length=40)
    checkSize: Optional[str] = Field(default=None, max_length=40)
    nextStep: Optional[str] = Field(default=None, max_length=200)
    nextDate: Optional[str] = Field(default=None, max_length=10)
    history: List[Dict[str, str]] = Field(default_factory=list, max_length=50)


class DigestSnapshotIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)
    venture: str = Field(default='', max_length=120)
    pipeline: List[DigestInvestor] = Field(default_factory=list, max_length=200)
    dd: Dict[str, Any] = Field(default_factory=dict)
    round: Dict[str, Any] = Field(default_factory=dict)


@api.put('/digest/settings')
async def save_digest_settings(body: DigestSettingsIn):
    try:
        ZoneInfo(body.timezone)
    except Exception:
        raise HTTPException(422, 'Unknown timezone')
    if body.enabled and not body.email:
        raise HTTPException(422, 'An email address is required to turn the digest on')
    doc = {**body.model_dump(), 'updatedAt': now_iso()}
    await db.digest_settings.update_one({'clientId': body.clientId}, {'$set': doc}, upsert=True)
    return await db.digest_settings.find_one({'clientId': body.clientId}, NO_ID)


@api.get('/digest/settings')
async def get_digest_settings(clientId: str):
    return await db.digest_settings.find_one({'clientId': clientId}, NO_ID) or DigestSettingsIn(clientId=clientId).model_dump()


@api.put('/digest/snapshot')
async def save_digest_snapshot(body: DigestSnapshotIn):
    await db.digest_snapshots.update_one({'clientId': body.clientId}, {'$set': {**body.model_dump(), 'updatedAt': now_iso()}}, upsert=True)
    return {'saved': True}


def build_digest(snap: dict, lang: str, now: datetime) -> dict:
    el = lang == 'el'
    today = now.date().isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    pipeline = snap.get('pipeline') or []
    active = [p for p in pipeline if p['stage'] not in ('Passed', 'Closed')]
    moves = [(p['name'], h['stage'], h['at']) for p in pipeline for h in (p.get('history') or [])[1:] if h.get('at', '') >= week_ago]
    overdue = sorted([p for p in active if p.get('nextDate') and p['nextDate'] < today], key=lambda p: p['nextDate'])
    upcoming = sorted([p for p in active if p.get('nextDate') and today <= p['nextDate'] <= (now + timedelta(days=7)).date().isoformat()], key=lambda p: p['nextDate'])
    dd = snap.get('dd') or {}
    rnd = snap.get('round') or {}
    venture = snap.get('venture') or 'your startup'
    stages: Dict[str, int] = {}
    for p in pipeline:
        stages[p['stage']] = stages.get(p['stage'], 0) + 1
    L = (lambda en, gr: gr if el else en)
    lines = [L(f'Weekly investor digest — {venture}', f'Εβδομαδιαία σύνοψη επενδυτών — {venture}'), '']
    if rnd.get('target'):
        pct = round(100 * (rnd.get('committed') or 0) / rnd['target'])
        lines.append(L(f"Round: {pct}% committed of {rnd.get('targetLabel') or rnd['target']} ({rnd.get('instrument', '')}).",
                       f"Γύρος: {pct}% δεσμευμένο από {rnd.get('targetLabel') or rnd['target']} ({rnd.get('instrument', '')})."))
    lines.append(L(f'Pipeline: {len(pipeline)} tracked, {len(active)} active — ', f'Αγωγός: {len(pipeline)} σε παρακολούθηση, {len(active)} ενεργοί — ')
                 + ', '.join(f'{k} {v}' for k, v in stages.items()))
    lines += ['', L('Moves this week', 'Μετακινήσεις της εβδομάδας')]
    lines += [f'• {n} → {st}' for n, st, _ in moves] or [L('• None', '• Καμία')]
    lines += ['', L('Overdue follow-ups', 'Εκπρόθεσμα follow-up')]
    lines += [f"• {p['name']}: {p.get('nextStep') or '—'} ({p['nextDate']})" for p in overdue] or [L('• None', '• Κανένα')]
    lines += ['', L('Due in the next 7 days', 'Λήγουν τις επόμενες 7 ημέρες')]
    lines += [f"• {p['name']}: {p.get('nextStep') or '—'} ({p['nextDate']})" for p in upcoming] or [L('• None', '• Κανένα')]
    if dd.get('total'):
        lines += ['', L(f"Due diligence: {dd.get('done', 0)}/{dd['total']} ready, {dd.get('inProgress', 0)} in progress.",
                        f"Δέουσα επιμέλεια: {dd.get('done', 0)}/{dd['total']} έτοιμα, {dd.get('inProgress', 0)} σε εξέλιξη.")]
        lines += [f'• {t}' for t in (dd.get('open') or [])[:5]]
    subject = L(f"{venture}: {len(overdue)} overdue, {len(moves)} move{'' if len(moves) == 1 else 's'} this week", f'{venture}: {len(overdue)} εκπρόθεσμα, {len(moves)} μετακινήσεις')
    return {'subject': subject, 'text': '\n'.join(lines),
            'stats': {'tracked': len(pipeline), 'active': len(active), 'moves': len(moves), 'overdue': len(overdue), 'upcoming': len(upcoming)}}


async def digest_for(client_id: str, now: Optional[datetime] = None) -> dict:
    snap = await db.digest_snapshots.find_one({'clientId': client_id}, NO_ID)
    if not snap:
        raise HTTPException(404, 'No digest data yet — open Fundraising once so the app can sync it')
    settings = await db.digest_settings.find_one({'clientId': client_id}, NO_ID) or {}
    return build_digest(snap, settings.get('lang', 'en'), now or datetime.now(timezone.utc))


@api.get('/digest/preview')
async def digest_preview(clientId: str):
    return await digest_for(clientId)


async def send_digest(client_id: str, trigger: str) -> dict:
    settings = await db.digest_settings.find_one({'clientId': client_id}, NO_ID) or {}
    if not settings.get('email'):
        raise HTTPException(422, 'Add an email address in Settings first')
    digest = await digest_for(client_id)
    entry = await deliver(client_id, settings['email'], digest['subject'], digest['text'], 'digest', trigger=trigger)
    await db.digests.insert_one({'clientId': client_id, 'at': entry['at'], 'subject': digest['subject'], 'stats': digest['stats'],
                                 'status': entry['status'], 'trigger': trigger})
    return {**digest, 'status': entry['status'], 'at': entry['at']}


class ClientIn(BaseModel):
    clientId: str = Field(min_length=4, max_length=80)


@api.post('/digest/send-now')
async def digest_send_now(body: ClientIn):
    return await send_digest(body.clientId, 'manual')


@api.get('/digest/history')
async def digest_history(clientId: str):
    return await db.digests.find({'clientId': clientId}, NO_ID).sort('at', -1).to_list(12)


def due_now(settings: dict, now_utc: datetime) -> Optional[str]:
    """Returns this week's key when the digest is due in the user's own timezone, else None."""
    local = now_utc.astimezone(ZoneInfo(settings.get('timezone') or 'Europe/Athens'))
    sunday_based = (local.weekday() + 1) % 7
    if sunday_based != settings.get('day') or local.hour != settings.get('hour'):
        return None
    year, week, _ = local.isocalendar()
    return f'{year}-W{week:02d}'


async def run_digests(run_id: str):
    now = datetime.now(timezone.utc)
    async for settings in db.digest_settings.find({'enabled': True}, NO_ID):
        week = due_now(settings, now)
        if not week or settings.get('lastSentWeek') == week:
            continue
        try:
            await send_digest(settings['clientId'], f'cron:{run_id}')
            await db.digest_settings.update_one({'clientId': settings['clientId']}, {'$set': {'lastSentWeek': week}})
        except HTTPException as err:
            logger.info('digest skipped for %s: %s', settings['clientId'], err.detail)


@api.post('/cron/digest')
async def cron_digest(request: Request, background: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get('WEBHOOK_CRON_SECRET', '')
    auth = request.headers.get('authorization', '')
    if not secret or not auth.startswith('Bearer ') or not hmac.compare_digest(auth[7:], secret):
        return JSONResponse({'error': 'unauthorized'}, status_code=401)
    try:
        envelope = await request.json()
    except Exception:
        return JSONResponse({'error': 'invalid body'}, status_code=400)
    run_id = request.headers.get('x-webhook-id') or (envelope or {}).get('run_id') or uuid.uuid4().hex
    try:
        await db.cron_runs.insert_one({'_id': f'digest:{run_id}', 'at': now_iso()})
    except Exception:
        return {'accepted': True, 'duplicate': True}
    background.add_task(run_digests, run_id)
    return {'accepted': True}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
