# CoFounderBay AI proxy per-IP rate limit (run ALONE, last: it exhausts this IP's 60s bucket)
import uuid
import requests
from test_cofounderbay_api import BASE_URL


def test_bearer_does_not_mint_bucket():
    codes = []
    for i in range(40):
        r = requests.post(f'{BASE_URL}/api/ai/generate', json={}, headers={'Authorization': f'Bearer {uuid.uuid4().hex}{i}'})
        codes.append(r.status_code)
    print(codes)
    assert 429 in codes


def test_spoofed_x_forwarded_for_is_ignored():
    # Unit-level: pod egress IPs rotate, so assert on caller_key directly.
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from server import caller_key

    class Req:
        def __init__(self, xff):
            self.headers = {'x-forwarded-for': xff}
            self.client = None

    real = '35.193.209.116, 104.22.62.8, 34.36.184.211'
    assert caller_key(Req(real)) == '35.193.209.116'
    assert caller_key(Req('10.9.1.7, ' + real)) == '35.193.209.116'
