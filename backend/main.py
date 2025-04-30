from fastapi import FastAPI, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging
import pandas as pd
from typing import Dict, Any
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    logger.warning("OPENROUTER_API_KEY not found in environment variables")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo")

# API routes
@app.get("/api/ping")
def ping(request: Request):
    logger.info(f"API ping endpoint called. Headers: {dict(request.headers)}")
    logger.info(f"Request URL: {request.url}")
    return {"message": "pong"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    logger.info(f"File upload request received: {file.filename}")
    try:
        # Read the CSV file
        df = pd.read_csv(file.file)
        logger.info(f"CSV read successfully with columns: {df.columns.tolist()}")
        
        # Define possible gender column names (lowercase only)
        possible_gender_columns = ["gender", "sex", "gndr", "g", "s"]
        
        # Normalize column names for flexible matching
        normalized_columns = {col.lower(): col for col in df.columns}
        
        # Try to find a matching gender-related column
        gender_col = None
        for col in possible_gender_columns:
            if col in normalized_columns:
                gender_col = normalized_columns[col]
                break
        
        if not gender_col:
            raise ValueError("Missing a recognized gender column. Expected one of: gender, sex, gndr, g, s")
        
        logger.info(f"Using gender column: {gender_col}")
        
        # Get raw values for debugging
        raw_values = df[gender_col].astype(str).unique()
        logger.info(f"Raw unique values in column: {raw_values}")
        
        # Normalize and remap gender values
        normalized_gender = df[gender_col].astype(str).str.lower().str.strip()
        
        # Remap alternate values to standard format
        normalized_gender = normalized_gender.replace({
            # Numeric encodings
            "1": "male",
            "0": "female",
            # Letter encodings
            "m": "male",
            "f": "female",
            # Common variations
            "male.": "male",
            "female.": "female",
            "m.": "male",
            "f.": "female"
        })
        
        # Log unique values found for debugging
        unique_values = normalized_gender.unique()
        logger.info(f"Unique gender values after normalization: {unique_values}")
        
        # Count gender values
        num_male = normalized_gender.eq("male").sum()
        num_female = normalized_gender.eq("female").sum()
        total = num_male + num_female
        
        # Calculate percentages
        male_percent = (num_male / total * 100) if total > 0 else 0
        female_percent = (num_female / total * 100) if total > 0 else 0
        
        # Bias analysis
        bias_score = abs(num_male - num_female) / total if total > 0 else 0
        bias_label = ""
        
        if bias_score < 0.05:
            bias_label = "Balanced"
        elif bias_score < 0.2:
            bias_label = "Mildly Imbalanced"
        elif bias_score < 0.4:
            bias_label = "Significantly Imbalanced"
        else:
            bias_label = "Highly Imbalanced"
        
        result = {
            "used_column": gender_col,
            "male": int(num_male),
            "female": int(num_female),
            "total": int(total),
            "male_percent": round(male_percent, 2),
            "female_percent": round(female_percent, 2),
            "bias_score": round(bias_score, 2),
            "bias_label": bias_label,
            "raw_values": list(raw_values),  # For debugging
            "normalized_values": list(unique_values)  # For debugging
        }
        
        logger.info(f"Analysis complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return {"error": str(e)}

@app.post("/api/insight")
async def generate_insight(data: Dict[str, Any]):
    try:
        if not OPENROUTER_API_KEY:
            raise ValueError("OpenRouter API key not configured")
            
        # Debug logging for API key
        api_key = os.getenv("OPENROUTER_API_KEY")
        print("🔐 OPENROUTER_API_KEY (truncated):", api_key[:10] if api_key else "None")
        print("🔍 Headers being sent to OpenRouter:", {
            "Authorization": f"Bearer {api_key[:10]}..." if api_key else "None",
            "Content-Type": "application/json"
        })

        male = data.get("male")
        female = data.get("female")
        bias_score = data.get("bias_score")
        bias_label = data.get("bias_label")
        male_percent = data.get("male_percent")
        female_percent = data.get("female_percent")

        prompt = (
            f"The uploaded dataset contains {male} males ({male_percent}%) and {female} females ({female_percent}%). "
            f"The bias score is {bias_score}, which is classified as '{bias_label}'.\n\n"
            "As a healthcare data scientist, provide a comprehensive analysis with the following sections:\n\n"
            "1. RESEARCH IMPACT: How might this gender distribution affect research validity and generalizability?\n\n"
            "2. CLINICAL IMPLICATIONS: What specific healthcare outcomes could be affected by this gender imbalance?\n\n"
            "3. MITIGATION STRATEGIES: What 3-4 specific methodological approaches could researchers use to address this bias?\n\n"
            "4. REPORTING RECOMMENDATIONS: How should researchers ethically document and report this gender distribution?\n\n"
            "Format your response with clear section headings and bullet points for key recommendations."
        )

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            }
        )

        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        logger.info(f"Insight response: {reply}")

        return {"insight": reply}

    except Exception as e:
        logger.error(f"Error generating AI insight: {str(e)}")
        return {"error": str(e)}

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
