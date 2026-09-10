"""Offline stand-ins for the Ollama clients, injected via settings dotted paths.

The stub embedder is a deterministic bag-of-words hash: texts sharing tokens
get high cosine similarity, so retrieval ranking is testable without a model.
"""

import re
import zlib

from apps.assistant.clients import AssistantBackendError

DIM = 64


class StubEmbeddingClient:

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self.vector(text) for text in texts]

    @staticmethod
    def vector(text: str) -> list[float]:
        vec = [0.0] * DIM
        for token in re.findall(r'[a-z0-9]+', text.lower()):
            vec[zlib.crc32(token.encode()) % DIM] += 1.0
        return vec


class StubLLMClient:

    def generate(self, system: str, prompt: str, history=None) -> str:
        return 'GROUNDED_STUB_ANSWER'


class DownEmbeddingClient:

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise AssistantBackendError('stub: backend down')


class ExplodingEmbeddingClient:
    """Fails loudly (not with AssistantBackendError, which the engine catches and
    degrades from) so a test can prove a code path never embeds at all."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise AssertionError('the embedding model must not be called on this path')


class ExplodingLLMClient:

    def generate(self, system: str, prompt: str, history=None) -> str:
        raise AssertionError('the LLM must not be called on this path')
