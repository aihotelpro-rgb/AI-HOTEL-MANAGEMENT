import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://www.hotelbluebirdnest.com/api/v1/admin/settings",
    "https://www.hotelbluebirdnest.com/api/v1/admin/rooms",
    "https://www.hotelbluebirdnest.com/api/v1/public/availability"
]

print("=== AUDITING LIVE HOTEL BLUE BIRD INN (24 ROOMS / 2 FLOORS) ===")
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"[HTTP {resp.status}] SUCCESS: {url.split('/api/v1/')[-1]}")
            print(f"  Response: {content[:180]}\n")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"[HTTP {e.code}]: {url} -> {body[:150]}\n")
    except Exception as e:
        print(f"[ERROR]: {url} -> {e}\n")

# Intercom POST Test
print("=== TESTING LIVE INTERCOM VOIP SPEED-DIAL CALL ===")
call_url = "https://www.hotelbluebirdnest.com/api/v1/intercom/call"
payload = json.dumps({"room_number": "204", "from_extension": "100"}).encode('utf-8')
try:
    req = urllib.request.Request(call_url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}, method="POST")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print(f"[HTTP {resp.status}] INTERCOM CONNECTED: {resp.read().decode('utf-8')}\n")
except Exception as e:
    print(f"[INTERCOM TEST FAILED]: {e}\n")
