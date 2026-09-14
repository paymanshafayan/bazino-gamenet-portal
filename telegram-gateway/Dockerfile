# Telegram Gateway — Railway service (see README.md).
# Build context: telegram-gateway/ directory.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

# Railway injects $PORT; sqlite lives on the attached Railway Volume (/data).
# NOTE: no Docker VOLUME instruction — Railway's builder rejects it
# ("docker VOLUME is not supported, use Railway Volumes"). Mount the volume
# at /data in the service settings instead.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn src.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
