import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://www.hotelbluebirdnest.com/api/v1/reception/daily-bookings",
    "https://www.hotelbluebirdnest.com/api/v1/executive/stats"
]

print("=== VERIFYING DAILY-BOOKINGS & EXECUTIVE STATS ENDPOINTS ===")
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"[HTTP {resp.status}] SUCCESS: {url.split('/api/v1/')[-1]}")
            print(f"  Body: {content[:150]}\n")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"[HTTP {e.code}]: {url} -> {body[:150]}\n")
    except Exception as e:
        print(f"[ERROR]: {url} -> {e}\n")
