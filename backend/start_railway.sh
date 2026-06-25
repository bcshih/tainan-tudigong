#!/bin/bash
set -e

# Start swarm server (A2A agents) in background on port 9000
cd /app/agents
python -m dijizhu.swarm_server &
SWARM_PID=$!

# Wait for swarm to be ready
sleep 4

# Start gateway in foreground (Railway provides $PORT)
cd /app
exec uvicorn apps.api.gateway:app --host 0.0.0.0 --port ${PORT:-8080}
