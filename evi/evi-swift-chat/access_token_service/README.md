# Hume Access Token Service (Local Testing Only)

This service provides a simple local endpoint to obtain an access token for the Hume API. **It is intended for local testing with the example app only. Do not use this service in production.**

## Prerequisites
- Python 3.8+

## Setup Instructions

1. **Clone the repository** (if you haven't already):
   ```sh
   git clone <your-repo-url>
   cd access_token_service
   ```

2. **Create and activate a Python virtual environment:**
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```

4. **Set environment variables:**
   
   You must set your Hume API credentials as environment variables:
   ```sh
   export HUME_API_KEY=your_api_key_here
   export HUME_SECRET_KEY=your_secret_key_here
   ```

5. **Run the service:**
   ```sh
   python run_token_service.py
   ```
   The service will start on `http://localhost:8000`.

## Usage
- Make a `POST` request to `http://localhost:8000/access-token` to receive an access token.

## Important Warning
> [!WARNING]
> This service is for local testing only. For production, you must implement your own secure access token service. 