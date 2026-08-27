# Morpheus backend image.
#
# The container talks to Ollama on the HOST via host.docker.internal:
# models want the host's RAM and GPU, not a container's. Ports are
# published on the host's loopback only (see docker-compose.yml), so the
# containerised app keeps the same trust boundary as the native one.

FROM python:3.13-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    # Inside a container, loopback is the container itself; Ollama lives on
    # the host. docker-compose repeats this so it is visible in one place.
    OLLAMA_BASE_URL=http://host.docker.internal:11434 \
    # Bind all interfaces inside the container; compose publishes the port
    # on the host's 127.0.0.1 only.
    API_HOST=0.0.0.0 \
    DATA_DIR=/data

RUN useradd -m -u 1000 morpheus && \
    mkdir -p /data && \
    chown -R morpheus:morpheus /data

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=morpheus:morpheus app ./app

USER morpheus
EXPOSE 8000

# stdlib healthcheck; the old one needed the requests package installed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1

# One worker: one user, and the store is in-process state.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
