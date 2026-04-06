FROM python:3.11-slim

WORKDIR /app

# git is required by GitPython; curl is used by the healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y nvidia-nccl-cu12 nvidia-cuda-runtime-cu12 nvidia-cublas-cu12 2>/dev/null || true

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
