import os
import pytest

os.environ["ENVIRONMENT"] = "testing"
os.environ["TESTING"] = "true"

from app.core.config import settings
settings.ENVIRONMENT = "testing"
settings.TESTING = True

from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
