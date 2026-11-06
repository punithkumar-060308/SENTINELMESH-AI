import os
import asyncio
from typing import Any, Dict, Optional
import httpx
import pytest

os.environ["ENVIRONMENT"] = "testing"

from app.core.config import settings
settings.ENVIRONMENT = "testing"
settings.TESTING = True

from app.main import app


class DirectTestClient:
    """
    Robust ASGI TestClient that avoids socket/loop deadlocks in sandbox environments
    by invoking ASGI transport directly via httpx.AsyncClient.
    """
    def __init__(self, application):
        self.app = application

    def _run(self, coro):
        return asyncio.run(coro)

    def get(self, url: str, params: Optional[Dict[str, Any]] = None, **kwargs):
        async def _call():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
                return await client.get(url, params=params, **kwargs)
        return self._run(_call())

    def post(self, url: str, json: Any = None, **kwargs):
        async def _call():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
                return await client.post(url, json=json, **kwargs)
        return self._run(_call())

    def put(self, url: str, json: Any = None, **kwargs):
        async def _call():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
                return await client.put(url, json=json, **kwargs)
        return self._run(_call())

    def delete(self, url: str, **kwargs):
        async def _call():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
                return await client.delete(url, **kwargs)
        return self._run(_call())


@pytest.fixture(scope="session")
def client():
    return DirectTestClient(app)
