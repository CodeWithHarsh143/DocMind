"""Unit tests for cache_service using fakeredis."""

from app.services.cache_service import (
    get_cached_answer,
    get_cached_key,
    set_cached_key,
)


def test_cache_key_is_normalized_case_and_whitespace():
    assert get_cached_key(1, "  What is pgvector? ") == get_cached_key(1, "what is pgvector?")
    assert get_cached_key(1, "question").startswith("chat_cache:1:")


def test_cache_key_differs_per_organization():
    assert get_cached_key(1, "shared question") != get_cached_key(2, "shared question")


def test_cache_miss_returns_none(fake_cache_redis):
    assert get_cached_answer(1, "anything") is None


def test_cache_roundtrip(fake_cache_redis):
    set_cached_key(1, "What is RAG?", "Retrieval augmented generation")
    assert get_cached_answer(1, "What is RAG?") == "Retrieval augmented generation"
    # same org, same normalized question
    assert get_cached_answer(1, " what is rag? ") == "Retrieval augmented generation"


def test_cache_isolated_between_orgs(fake_cache_redis):
    set_cached_key(1, "secret?", "answer-for-org-1")
    assert get_cached_answer(2, "secret?") is None


def test_cache_sets_ttl(fake_cache_redis):
    set_cached_key(1, "question", "answer")
    ttl = fake_cache_redis.ttl(get_cached_key(1, "question"))
    assert 0 < ttl <= 3600