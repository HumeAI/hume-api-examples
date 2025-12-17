import pytest


def pytest_collection_modifyitems(config, items):
    for item in items:
        if item.obj.__doc__:
            docstring_first_line = item.obj.__doc__.strip().split("\n")[0]
            item._test_description = docstring_first_line
            item._nodeid = f"{item.nodeid} [{docstring_first_line}]"
