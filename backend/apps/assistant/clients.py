"""HTTP clients for the RAG pipeline (embeddings + generation).

Both are served by Ollama in dev/on-prem. The classes are resolved from
settings dotted paths (`ASSISTANT_EMBED_CLIENT` / `ASSISTANT_LLM_CLIENT`) so
tests inject offline stubs and prod can swap models without code changes —
the `LLMClient` swap point promised in docs/PHASE-7-RAG.md.
"""

import logging
import re

import requests
from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger(__name__)

_THINK_BLOCK = re.compile(r'<think>.*?</think>', re.DOTALL)

# Fail fast on the primary when a fallback is configured: cap the CONNECT wait so a
# dead/rotated dev tunnel doesn't burn the full (long) read timeout before we try the
# fallback. The read timeout is unchanged — generation itself is slow on CPU.
_FALLBACK_CONNECT_TIMEOUT = 4


def _post_with_fallback(primary, fallback, path, payload, read_timeout):
    """POST `payload` to primary+path; if the primary is unreachable and a distinct
    fallback URL is configured, transparently retry there. Lets a rotated/dead dev GPU
    tunnel (ASSISTANT_OLLAMA_URL) degrade to a local Ollama (ASSISTANT_OLLAMA_FALLBACK_URL)
    instead of dropping the assistant to the offline FAQ. Re-raises the last requests
    error only when every endpoint fails."""
    endpoints = [primary]
    if fallback and fallback != primary:
        endpoints.append(fallback)
    last_exc = None
    for index, base in enumerate(endpoints):
        has_fallback_left = index + 1 < len(endpoints)
        timeout = (_FALLBACK_CONNECT_TIMEOUT, read_timeout) if has_fallback_left else read_timeout
        try:
            resp = requests.post(f'{base.rstrip("/")}{path}', json=payload, timeout=timeout)
            resp.raise_for_status()
            if index:
                logger.info('assistant Ollama served by fallback %s', base)
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            if has_fallback_left:
                logger.warning('assistant Ollama %s unreachable (%s); trying fallback', base, exc)
    raise last_exc


class AssistantBackendError(Exception):
    """The embedding/LLM backend is unreachable or misbehaving."""


class OllamaEmbeddingClient:

    def __init__(self):
        self.base_url = settings.ASSISTANT_OLLAMA_URL.rstrip('/')
        self.fallback_url = (settings.ASSISTANT_OLLAMA_FALLBACK_URL or '').rstrip('/')
        self.model = settings.ASSISTANT_EMBED_MODEL
        self.keep_alive = settings.ASSISTANT_OLLAMA_KEEP_ALIVE

    def embed(self, texts: list[str]) -> list[list[float]]:
        payload = {'model': self.model, 'input': texts, 'keep_alive': self.keep_alive}
        try:
            resp = _post_with_fallback(self.base_url, self.fallback_url, '/api/embed', payload, 60)
            embeddings = resp.json().get('embeddings')
        except requests.RequestException as exc:
            raise AssistantBackendError(f'embedding backend unavailable: {exc}') from exc
        if not embeddings or len(embeddings) != len(texts):
            raise AssistantBackendError('embedding backend returned a malformed response')
        return embeddings


class OllamaLLMClient:

    def __init__(self):
        self.base_url = settings.ASSISTANT_OLLAMA_URL.rstrip('/')
        self.fallback_url = (settings.ASSISTANT_OLLAMA_FALLBACK_URL or '').rstrip('/')
        self.model = settings.ASSISTANT_LLM_MODEL
        # Reasoning models (e.g. qwen3) emit a slow <think> block by default; keep it
        # off for a snappy, direct chatbot. Harmless no-op for non-thinking models.
        self.think = settings.ASSISTANT_LLM_THINK
        self.keep_alive = settings.ASSISTANT_OLLAMA_KEEP_ALIVE
        self.num_predict = settings.ASSISTANT_LLM_NUM_PREDICT
        self.num_ctx = settings.ASSISTANT_LLM_NUM_CTX

    def generate(self, system: str, prompt: str, history=None) -> str:
        # Qwen3 ignores the `think` API flag on some Ollama builds (e.g. 0.32); its
        # `/no_think` soft-switch in the system prompt reliably disables the reasoning
        # block so answers come back directly and fast.
        if not self.think and 'qwen3' in self.model.lower():
            system = f'{system} /no_think'
        # Prior turns (already validated/capped upstream) sit between the system
        # prompt and the current grounded prompt so follow-ups keep their context.
        messages = [{'role': 'system', 'content': system}]
        for turn in (history or []):
            role, content = turn.get('role'), (turn.get('content') or '').strip()
            if role in ('user', 'assistant') and content:
                messages.append({'role': role, 'content': content})
        messages.append({'role': 'user', 'content': prompt})
        payload = {
            'model': self.model,
            'messages': messages,
            'stream': False,
            'think': self.think,
            'keep_alive': self.keep_alive,
            'options': {
                'temperature': 0.2,
                # The system prompt asks for 1-4 sentences; capping the decode stops a
                # rambling model from spending minutes on tokens nobody reads. Sized so
                # a long FR answer still fits.
                'num_predict': self.num_predict,
                # Right-sized to the real prompt (system + user facts + at most
                # ASSISTANT_RAG_MAX_CONTEXT chunks). A larger window than needed just
                # grows the KV cache and slows prefill.
                'num_ctx': self.num_ctx,
            },
        }
        try:
            resp = _post_with_fallback(self.base_url, self.fallback_url, '/api/chat', payload, 180)
            content = (resp.json().get('message') or {}).get('content', '')
        except requests.RequestException as exc:
            raise AssistantBackendError(f'LLM backend unavailable: {exc}') from exc
        # Defensive: strip any <think>…</think> an older Ollama might still emit.
        content = _THINK_BLOCK.sub('', content).strip()
        if not content:
            raise AssistantBackendError('LLM backend returned an empty answer')
        return content


def get_embedding_client():
    return import_string(settings.ASSISTANT_EMBED_CLIENT)()


def get_llm_client():
    return import_string(settings.ASSISTANT_LLM_CLIENT)()
