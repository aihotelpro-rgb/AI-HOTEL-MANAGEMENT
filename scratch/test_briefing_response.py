import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.hotelbluebirdnest.com/api/v1/executive/briefing"

print("=== VERIFYING LIVE EXECUTIVE BRIEFING TEXT RESPONSE ===")
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"[HTTP {resp.status}] SUCCESS!")
        print(f"  Date: {data.get('date')}")
        print(f"  Briefing Text Length: {len(data.get('briefing_text', ''))} chars")
        print(f"\n--- PREVIEW OF BRIEFING TEXT ---\n{data.get('briefing_text')[:300]}...\n")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f"[HTTP {e.code}]: {url} -> {body[:150]}")
except Exception as e:
    print(f"[ERROR]: {url} -> {e}")
