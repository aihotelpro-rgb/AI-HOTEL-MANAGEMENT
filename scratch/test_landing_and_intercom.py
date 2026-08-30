import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://www.hotelbluebirdnest.com/",
    "https://www.hotelbluebirdnest.com/room-qr?room=204"
]

print("=== AUDITING LIVE LANDING PAGE & ROOM 204 GUEST APP ===")
for url in URLS:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"[HTTP {resp.status}] SUCCESS: {url}")
            if "Hotel Blue Bird Inn" in content:
                print("  ✅ 'Hotel Blue Bird Inn' branding detected!")
            else:
                print("  ⚠️ Old branding or loading state")
            if "Room 204" in content or "room=204" in content:
                print("  ✅ 'Room 204' default guest route detected!\n")
    except Exception as e:
        print(f"[ERROR]: {url} -> {e}\n")
