import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://www.hotelbluebirdnest.com/api/v1/admin/settings",
    "https://www.hotelbluebirdnest.com/api/v1/qr_menu",
    "https://www.hotelbluebirdnest.com/api/v1/public/availability"
]

print("=== VERIFYING ALL LIVE CUSTOM DOMAIN API ENDPOINTS ===")
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            print(f"[SUCCESS HTTP {resp.status}]: {url}")
            print(f"  Response: {resp.read().decode('utf-8')[:150]}\n")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"[HTTP {e.code}]: {url} -> {body[:150]}\n")
    except Exception as e:
        print(f"[ERROR]: {url} -> {e}\n")
