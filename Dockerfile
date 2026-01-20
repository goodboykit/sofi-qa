# Stage 1: Build Frontend
FROM node:18-alpine as frontend_build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve Backend & Frontend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
# Remove firebase-admin if it slipped in (it shouldn't, but safe to ignore if missing)
RUN grep -v "firebase-admin" requirements.txt > requirements.tmp && mv requirements.tmp requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY src/ ./src/

# Copy Data (Defaults)
COPY data/ ./data/

# Copy Tests (for Evaluation)
COPY tests/ ./tests/
COPY pytest.ini .

# Copy Frontend Build
COPY --from=frontend_build /app/frontend/dist ./frontend/dist

# Environment variables
ENV PYTHONUNBUFFERED=1

# Expose Port
EXPOSE 8000

# Run
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
