import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.hotelbluebirdnest.com/api/v1/qr_menu"

print("=== READING VERCEL FASTAPI ERROR DETAIL BODY ===")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print(f"[HTTP {resp.status}]: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f"[HTTP {e.code}]: {body}")
except Exception as e:
    print(f"[ERROR]: {e}")
