# Use the official Python base image
FROM --platform=linux/amd64 python:3.11-slim

# Install Poetry
RUN python3 -m venv .venv
RUN . .venv/bin/activate

RUN pip install --upgrade pip
RUN pip install poetry

# Add Poetry to PATH
ENV PATH="$HOME/.local/bin:${PATH}"

# Set the working directory in the container
WORKDIR /app

# Copy only the poetry files first to leverage Docker cache
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry install --no-root --no-dev

# Copy the rest of the application code into the container
COPY . .

# Install the application
RUN poetry install --no-dev

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["poetry", "run", "fastapi", "run", "app.py"]