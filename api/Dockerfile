FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CHAT_CONCURRENCY=24 \
    GROQ_MODEL=qwen/qwen3.8-27b \
    GROQ_MAX_TOKENS=320

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY ml ./ml
COPY knowledge ./knowledge
COPY scripts ./scripts
RUN mkdir -p data/chroma knowledge/official

EXPOSE 8000

# Single worker: Chroma + in-process caches stay coherent.
# Concurrency comes from async + thread pool inside the app.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop", "--http", "httptools", "--timeout-keep-alive", "15"]
