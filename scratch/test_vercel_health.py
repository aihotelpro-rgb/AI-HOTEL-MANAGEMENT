import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/api/v1/admin/settings",
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/api/v1/qr_menu",
    "https://ai-hotel-management-26vage02q-bhobho.vercel.app/api/v1/public/availability"
]

print("=== TESTING DIRECT VERCEL DOMAIN HIGH-SPEED API ROUTES ===")
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"[HTTP {resp.status}] SUCCESS: {url}")
            print(f"  JSON Data: {content[:160]}\n")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"[HTTP {e.code}] FAILED: {url} -> {body[:150]}\n")
    except Exception as e:
        print(f"[ERROR]: {url} -> {e}\n")
