import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.hotelbluebirdnest.com/api/v1/intercom/history"

print("=== VERIFYING LIVE INTERCOM HISTORY API ENDPOINT ===")
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        content = resp.read().decode('utf-8')
        print(f"[HTTP {resp.status}] SUCCESS: {content[:300]}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f"[HTTP {e.code}]: {url} -> {body}")
except Exception as e:
    print(f"[ERROR]: {url} -> {e}")
