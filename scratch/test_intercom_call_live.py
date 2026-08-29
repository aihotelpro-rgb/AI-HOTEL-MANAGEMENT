import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.hotelbluebirdnest.com/api/v1/intercom/call"
payload = json.dumps({"room_number": "204", "from_extension": "100"}).encode('utf-8')

print("=== VERIFYING LIVE INTERCOM CALL API ENDPOINT ===")
try:
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}, method="POST")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        content = resp.read().decode('utf-8')
        print(f"[HTTP {resp.status}] SUCCESS: Intercom Call Active!")
        print(f"  Response JSON: {content}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f"[HTTP {e.code}]: {url} -> {body}")
except Exception as e:
    print(f"[ERROR]: {url} -> {e}")
