# Build frontend
FROM node:18 as frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

COPY --from=frontend /frontend/build ./build

# Set environment variables
ENV FRONTEND_PATH=/app/build
ENV OPENROUTER_API_KEY=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

# Expose the port the app runs on
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
