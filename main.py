"""
main.py — Root-level ASGI entry point for SupplySense.
Enables Render (and other platforms) to launch the service cleanly
whether the configured Root Directory is '.' or 'backend/'.
"""
import sys
import os

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
