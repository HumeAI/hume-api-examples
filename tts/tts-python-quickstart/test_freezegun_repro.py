# Minimal repro for https://github.com/HumeAI/hume-python-sdk/issues/442
# Hume's __getattr__ in hume/__init__.py causes infinite recursion when freezegun
# scans module attributes (via getattr) during its startup.
#
# Freezegun's _get_module_attributes() does:
#   for name in dir(module):
#       getattr(module, name)  # <- triggers hume.__getattr__ for lazy attrs

import pytest
from freezegun import freeze_time

# Import hume at module level so it's in sys.modules when freezegun scans
import hume  # noqa: F401


def _simulate_freezegun_module_scan(module):
    """Replicate freezegun's _get_module_attributes() - the part that triggers the bug."""
    result = []
    for attribute_name in dir(module):
        try:
            attribute_value = getattr(module, attribute_name)
        except (ImportError, AttributeError, TypeError):
            continue
        result.append((attribute_name, attribute_value))
    return result


def test_simulate_freezegun_scan_on_hume():
    """Simulate what freezegun does - getattr(hume, name) for each name in dir(hume)."""
    attrs = _simulate_freezegun_module_scan(hume)
    assert len(attrs) >= 1
    names = [n for n, _ in attrs]
    assert "AsyncHumeClient" in names or "tts" in names


def test_hume_with_freezegun():
    """Import hume and use freezegun - may trigger RecursionError per issue #442."""
    with freeze_time("2025-01-01"):
        # freeze_time scans all loaded modules; hume has lazy __getattr__
        _ = hume.__version__  # ensure we've touched the module
        assert True


def test_hume_with_freezegun_ignore_workaround():
    """Workaround: ignore hume to avoid recursion when freeze_time scans modules."""
    # See https://github.com/HumeAI/hume-python-sdk/issues/442
    with freeze_time("2025-01-01", ignore=["hume"]):
        _ = hume.AsyncHumeClient
        assert True
