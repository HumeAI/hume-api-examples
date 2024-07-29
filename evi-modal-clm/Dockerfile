# Use the official Python base image
FROM python:3.11-slim

# Install Poetry
RUN apt-get update && apt-get install -y curl \
    && curl -sSL https://install.python-poetry.org | python3 - \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add Poetry to PATH
ENV PATH="/root/.local/bin:${PATH}"

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