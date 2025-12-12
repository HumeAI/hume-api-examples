"""
Pytest configuration to show test descriptions similar to TypeScript test output.

This customizes pytest to display the first line of test docstrings
as the test name, making it easier to read test output.
"""

import pytest


def pytest_collection_modifyitems(config, items):
    """
    Modify test items to show docstring descriptions in verbose output.

    This hook runs after test collection and allows us to customize
    how tests are displayed by modifying the nodeid to include the description.
    """
    for item in items:
        # Get the first line of the docstring if it exists
        if item.obj.__doc__:
            docstring_first_line = item.obj.__doc__.strip().split("\n")[0]
            # Store the description for use in reporting
            item._test_description = docstring_first_line
            # Modify the nodeid to show description prominently
            # Format: file::function_name [description]
            item._nodeid = f"{item.nodeid} [{docstring_first_line}]"


def pytest_report_teststatus(report, config):
    """
    Customize test status reporting to show descriptions in a cleaner format.
    """
    # This hook allows us to customize how test status is reported
    # The nodeid modification in pytest_collection_modifyitems handles the display
    pass
