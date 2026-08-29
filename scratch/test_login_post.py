import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.hotelbluebirdnest.com/api/v1/auth/login"
payload = json.dumps({"username": "admin", "password": "adminpassword"}).encode('utf-8')

print("=== TESTING POST /api/v1/auth/login ON CUSTOM DOMAIN ===")
try:
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}, method="POST")
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        print(f"[SUCCESS HTTP {resp.status}]: {resp.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f"[HTTP {e.code}]: {body}")
except Exception as e:
    print(f"[ERROR]: {e}")
