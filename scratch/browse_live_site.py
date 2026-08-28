import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

VERCEL_URLS = [
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/admin",
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/room-qr?room=304",
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/login"
]

print("=== BROWSING DIRECT VERCEL PRODUCTION DEPLOYMENT URLS ===")

for url in VERCEL_URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            print(f"\n[HTTP {resp.status}] SUCCESS: {url}")
            print(f"Content Length: {len(content)} bytes")
            print(f"HTML Preview: {content[:250].replace('\n', ' ')}")
    except urllib.error.HTTPError as e:
        print(f"\n[HTTP {e.code}] FAILED: {url}")
    except Exception as e:
        print(f"\n[ERROR] {url} -> {e}")
