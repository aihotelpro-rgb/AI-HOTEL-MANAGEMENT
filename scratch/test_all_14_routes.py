import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://www.hotelbluebirdnest.com/api/v1/admin/staff",
    "https://www.hotelbluebirdnest.com/api/v1/admin/rooms",
    "https://www.hotelbluebirdnest.com/api/v1/admin/inventory",
    "https://www.hotelbluebirdnest.com/api/v1/admin/cctv",
    "https://www.hotelbluebirdnest.com/api/v1/admin/menu",
    "https://www.hotelbluebirdnest.com/api/v1/admin/channel-engine/status",
    "https://www.hotelbluebirdnest.com/api/v1/reception/rooms",
    "https://www.hotelbluebirdnest.com/api/v1/reception/active-stays",
    "https://www.hotelbluebirdnest.com/api/v1/reception/whatsapp-feed",
    "https://www.hotelbluebirdnest.com/api/v1/qr_menu/orders",
    "https://www.hotelbluebirdnest.com/api/v1/housekeeping/tickets",
    "https://www.hotelbluebirdnest.com/api/v1/housekeeping/rooms",
    "https://www.hotelbluebirdnest.com/api/v1/executive/briefing",
    "https://www.hotelbluebirdnest.com/api/v1/executive/stats"
]

print("=== AUDITING ALL 14 PORTAL DASHBOARD API ROUTES ON LIVE DOMAIN ===")
success_count = 0
for url in URLS:
    route_name = url.split('/api/v1/')[-1]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            content = resp.read().decode('utf-8')
            print(f"[HTTP {resp.status}] SUCCESS: {route_name} -> {content[:80]}")
            success_count += 1
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"[HTTP {e.code}] PENDING_BUILD: {route_name} -> {body[:80]}")
    except Exception as e:
        print(f"[ERROR] {route_name} -> {e}")

print(f"\nTOTAL PASSED: {success_count} / {len(URLS)}")
