from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

frontend_path = os.getenv("FRONTEND_PATH", "build")
logger.info(f"Frontend path: {frontend_path}")
logger.info(f"Directory contents: {os.listdir(frontend_path)}")
logger.info(f"Assets directory exists: {os.path.exists(os.path.join(frontend_path, 'assets'))}")
logger.info(f"Assets contents: {os.listdir(os.path.join(frontend_path, 'assets'))}")

# Mount static assets first (this takes precedence over routes)
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
logger.info("Mounted static files at /assets")

# API routes
@app.get("/api/ping")
def ping(request: Request):
    logger.info(f"API ping endpoint called. Headers: {dict(request.headers)}")
    logger.info(f"Request URL: {request.url}")
    return {"message": "pong"}

# Serve index.html on root
@app.get("/")
def serve_root(request: Request):
    logger.info(f"Root route called. Headers: {dict(request.headers)}")
    logger.info(f"Request URL: {request.url}")
    index_file = os.path.join(frontend_path, "index.html")
    logger.info(f"Serving root from: {index_file}")
    return FileResponse(index_file)

# Fallback for React routes
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str, request: Request):
    logger.info(f"Fallback route called for path: {full_path}")
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Request headers: {dict(request.headers)}")
    # Don't handle asset requests
    if full_path.startswith("assets/"):
        logger.info(f"Ignoring asset request: {full_path}")
        return None
    index_file = os.path.join(frontend_path, "index.html")
    logger.info(f"Serving SPA fallback for: {full_path}")
    return FileResponse(index_file)
