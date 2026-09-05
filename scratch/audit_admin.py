import re

with open('frontend/src/app/admin/page.tsx', encoding='utf-8') as f:
    content = f.read()

keywords = [
    'OTA', 'channel manager', 'channel engine', 'rate sync', 'inventory sync',
    'booking.com', 'agoda', 'expedia', 'makemytrip', 'goibibo', 'airbnb',
    'room mapping', 'rate plan mapping', 'stop sell', 'promotion', 'bulk update',
    'sync health', 'webhook', 'anomaly', 'forecasting', 'competitor',
    'multi-property', 'audit log', 'revenue management', 'dynamic pricing',
    'overbooking', 'reconciliation', 'restriction', 'MinLOS', 'booking engine',
    'Rate Manager', 'Inventory Manager', 'Sync'
]

print("=== Admin Page Keyword Scan ===")
for kw in keywords:
    count = len(re.findall(re.escape(kw), content, re.IGNORECASE))
    status = "FOUND x" + str(count) if count > 0 else "MISSING"
    print(f"  [{status:12}] {kw}")

# Count total lines
lines = content.split('\n')
print(f"\nTotal lines in admin/page.tsx: {len(lines)}")

# Find tab names (common patterns)
nav_items = re.findall(r"label:\s*['\"]([^'\"]+)['\"]", content)
print(f"\n=== Navigation Labels Found ({len(nav_items)}): ===")
for item in nav_items[:50]:
    print(f"  - {item}")
