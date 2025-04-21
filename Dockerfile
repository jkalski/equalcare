# Build frontend
FROM node:18 as frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend
FROM python:3.12-slim

WORKDIR /app
COPY backend/ ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --from=frontend /frontend/build ./build

ENV FRONTEND_PATH=build
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
