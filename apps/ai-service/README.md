# EMS AI Service

Autonomous AI Microservice for the Educational Management System built with FastAPI and Python.

## Responsibilities
- Autonomous educational agent workflows (Tutor, Teaching Assistant, Exam Generator, Lesson Summarizer).
- Hybrid retrieval with pgvector vector store.
- Internal inter-service communication with the NestJS main backend.

## Architecture
- `src/main.py`: Application entrypoint with CORS, logging, and lifecycle hooks.
- `src/config/`: Pydantic environment settings and security configurations.
- `src/api/routes/`: Route handlers (e.g. `/health`).
- `src/agents/`: Autonomous agent definitions.
- `src/workflows/`: Multi-step LangGraph state machines.
- `src/tools/`: Custom educational and operational tool definitions.
- `src/retrieval/`: Vector embeddings and similarity retrieval engines.
- `tests/`: Automated unit and integration tests.

## Running Locally
```bash
# Activate virtual environment
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate  # Unix

# Start development server
uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

## Running Automated Tests
```bash
.venv\Scripts\pytest -v
```

## Endpoints
- Root: `http://127.0.0.1:8000/`
- Health: `http://127.0.0.1:8000/health`
- Swagger Docs: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
