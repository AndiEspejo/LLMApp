import os

import pytest
from sqlalchemy.exc import OperationalError

from app.db.session import get_db
from app.main import app


class FakeSession:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    def execute(self, *_args, **_kwargs):
        if self.fail:
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))


def test_health_ok(client):
    app.dependency_overrides[get_db] = lambda: FakeSession()

    res = client.get("/health")

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["version"]


def test_health_reports_503_when_database_is_down(client):
    app.dependency_overrides[get_db] = lambda: FakeSession(fail=True)

    res = client.get("/health")

    assert res.status_code == 503
    body = res.json()
    assert body["status"] == "degraded"
    assert body["database"] == "error"


@pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="needs a running Postgres; set RUN_DB_TESTS=1 (CI does)",
)
def test_health_against_real_database(client):
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json()["database"] == "ok"
