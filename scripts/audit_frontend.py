import os, re, json
from pathlib import Path

# Load backend schemas
try:
    with open('audit_results.json', 'r') as f:
        backend_schemas = json.load(f)
except FileNotFoundError:
    print("Run audit_api.py first.")
    exit(1)

frontend_dir = Path("frontend/src/app/(dashboard)")

# We'll just print out interfaces for each file.
for page_file in frontend_dir.rglob("page.tsx"):
    print(f"--- {page_file.parent.name} ---")
    content = page_file.read_text(encoding='utf-8')
    
    # Extract interfaces
    interfaces = re.findall(r'interface\s+(\w+)\s*\{([^}]*)\}', content)
    for name, body in interfaces:
        fields = [f.split(':')[0].strip().replace('?', '') for f in body.split('\n') if ':' in f]
        print(f"  Interface: {name}")
        print(f"  Fields: {fields}")
    
    # Extract API calls
    api_calls = re.findall(r'fetch\(`\$\{API\}([^`]+)`', content)
    for api in api_calls:
        # Strip query params
        base_api = api.split('?')[0]
        print(f"  Calls: {base_api}")
        if base_api in backend_schemas:
            schema = backend_schemas[base_api].get('schema')
            print(f"    Backend returns: {schema}")
        else:
            print(f"    Backend status: {backend_schemas.get(base_api)}")
    print()
