
# Icosnet Training Platform

Internal e-learning platform — Django/DRF API + Next.js UI, with an AI course assistant powered by a local LLM (Ollama).

## Requirements

- Python 3.13, Node 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (runs the PostgreSQL database)
- [Ollama](https://ollama.com/download) (for the AI assistant — see below)

## First-time setup

**1. Database — PostgreSQL in Docker** (one-time; the container then starts automatically whenever Docker Desktop is running):

```powershell
docker run -d --name icosnet-pg --restart unless-stopped `
  -e POSTGRES_USER=icosnet -e POSTGRES_PASSWORD=icosnet -e POSTGRES_DB=icosnet `
  -p 5432:5432 -v icosnet-pg-data:/var/lib/postgresql/data postgres:16
```

**2. Backend:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env      # then, in .env, uncomment the DATABASE_URL line
python manage.py migrate
python manage.py seed_db    # loads the shipped content (accounts, courses, assistant index)
```

**3. Frontend:**

```powershell
cd ..\frontend
npm install
# .env.local must contain:  NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

The seed (`backend/seed/content.json`) ships with the repo — accounts, courses, and the assistant's search index are all in it, so the platform is ready to use from the first start.

<details>
<summary>Starting from an empty database instead</summary>

Skip `seed_db` and build up from scratch:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_reference   # reference data (categories, badges, chat rooms, FAQ) — no demo content
python manage.py rebuild_index    # assistant search index (needs Ollama running)
```
</details>

<details>
<summary>Running on SQLite instead (no Docker)</summary>

The app is database-agnostic: with `DATABASE_URL` left commented out in `backend/.env`, it
falls back to the bundled `backend/db.sqlite3`, which carries the same content — no Docker
needed. PostgreSQL is the recommended setup (and what production uses); SQLite is handy as
a zero-dependency fallback.
</details>

## Running the project

Make sure **Docker Desktop is running** (the database container starts with it), then two terminals:

```powershell
# Terminal 1 — backend  (http://localhost:8000)
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

```powershell
# Terminal 2 — frontend  (http://localhost:3000)
cd frontend
npm run dev
```

Data lives in the `icosnet-pg` PostgreSQL container (Docker volume `icosnet-pg-data`). To back it up:

```powershell
docker exec icosnet-pg pg_dump -U icosnet -d icosnet -F c -f /tmp/icosnet.backup
docker cp icosnet-pg:/tmp/icosnet.backup .
```

## The AI assistant (Ollama)

The in-app assistant answers questions about courses using RAG over the platform's content. It needs **Ollama running on this machine** with two models:

```powershell
ollama pull bge-m3        # embeddings (indexing + search)
ollama pull qwen2.5:7b    # the LLM that writes the answers
```

Ollama serves on `http://localhost:11434`, which is already the backend's default — no configuration needed. Just make sure the Ollama app is running (check with `ollama list`).

The shipped seed already includes the search index, so this usually just works. **If you started from an empty database** (or the assistant's answers seem off), rebuild the index:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py rebuild_index
```

Day-to-day course edits re-index themselves automatically on save — unless Ollama happened to be stopped at that moment, in which case that one document is left out of the index. To catch those up without re-embedding everything:

```powershell
python manage.py rebuild_index --reconcile
```

Before a demo, you can also pre-load both models so the first question doesn't wait for them:

```powershell
python manage.py warm_assistant
```

### Running on a GPU (recommended for production)

Answer speed is dominated by the LLM, which is **CPU-bound** without a GPU (~30–45s per answer). On a GPU the same model answers in **~1–2s** — roughly 30× faster. The application code is identical either way; the only difference is *where* Ollama runs, so this is a deployment/hardware choice, **not a code change**.

Run Ollama on a GPU machine and point the backend at it:

**1. On the GPU host**, install [Ollama](https://ollama.com/download) and pull the two models:

```
ollama pull bge-m3
ollama pull qwen2.5:7b
```

**2. Expose it** — only needed if the GPU host is a *different* machine from the backend (Ollama listens on localhost by default):

```
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

**3. Point the backend at it** in `backend/.env`:

```
ASSISTANT_OLLAMA_URL=http://<gpu-host>:11434
```

If Ollama runs on the **same** machine as the backend, the default `http://localhost:11434` already works — leave it unset. Both models stay resident in GPU memory between requests (`ASSISTANT_OLLAMA_KEEP_ALIVE`, default `60m`), so only the first question after startup pays the load cost; run `python manage.py warm_assistant` to pre-load them.

### If the assistant misbehaves

- **Generic/keyword-y answers?** The index is probably empty — run `rebuild_index` (without it the assistant silently falls back to the offline FAQ engine).
- **A course or FAQ the assistant doesn't seem to know about?** Run `rebuild_index --reconcile`.
- **Slow answers?** Expected on a machine without a GPU — generation is CPU-bound and can take a while; run Ollama on a GPU to make it fast (see **Running on a GPU** above). Greetings and thanks are instant (they never reach the model); every other message, including "what are my courses?", is written by the LLM and takes as long as it takes.
- **Errors mentioning the model?** Run `ollama list` and confirm both `bge-m3` and `qwen2.5:7b` are there.
- Model and tuning knobs (similarity threshold, top-k, alternative models) can be overridden in `backend/.env` — see `backend/.env.example`.

## Troubleshooting

- **`connection refused` / `could not connect to server` on startup** → Docker Desktop isn't running (or the `icosnet-pg` container is stopped). Start Docker Desktop; the container comes up with it (`docker ps` should list `icosnet-pg`).
- **`duplicate key value violates unique constraint` right after seeding** → the sequence reset didn't run; re-run `python manage.py seed_db` (it's safe to repeat).
