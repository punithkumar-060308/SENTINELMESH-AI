"""Regression and Unit Test Suite for Demo API.
Configured by the application, never generated or modified by the LLM.
Implements Section 1 & 6 of 08_TESTING_AND_VERIFICATION.md.
"""

import pytest
from demo_api.service import get_users


def test_get_users_baseline():
    """Verify standard user retrieval baseline."""
    users = get_users(pool_timeout=1.0, max_connections=10, current_connections=2)
    assert len(users) == 2
    assert users[0]["username"] == "admin"


def test_get_users_under_load():
    """Verify endpoint behaves gracefully under connection saturation."""
    users = get_users(pool_timeout=0.05, max_connections=10, current_connections=10)
    assert len(users) >= 1
    assert "status" in users[0]


def test_regression_invariant_check():
    """Regression test ensuring zero drift on user attributes."""
    users = get_users(pool_timeout=0.5, max_connections=10, current_connections=5)
    for u in users:
        assert "id" in u
        assert "username" in u
