"""Unit tests for the RQ queue running in synchronous (inline) mode.

RQ builds a reference to the job callable and must be able to import it, so
the helpers below are module-level functions, not closures.
"""

from app.tasks.document_tasks import process_document_tasks


def _double(x):
    return x * 2


def _boom():
    raise ValueError("kaboom")


def test_sync_queue_runs_job_inline(sync_queue):
    job = sync_queue.enqueue(_double, 21)

    assert job.is_finished
    assert job.result == 42


def test_sync_queue_captures_failures(sync_queue):
    job = sync_queue.enqueue(_boom)

    assert job.is_failed
    assert "kaboom" in job.exc_info


def test_document_task_runs_without_worker(sync_queue, db_session):
    """process_document_tasks executes inline against the test schema."""
    job = sync_queue.enqueue(process_document_tasks, 999999)  # missing document
    assert job.is_finished, job.exc_info
    assert job.result is None