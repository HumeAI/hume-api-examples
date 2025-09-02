#!/usr/bin/env python3
import os
import base64
from flask import Flask, jsonify, abort
import httpx

app = Flask(__name__)

@app.route("/access-token", methods=["GET"])
def get_access_token():
    # Load credentials from environment
    api_key = os.getenv("HUME_API_KEY")
    secret_key = os.getenv("HUME_SECRET_KEY")
    if not api_key or not secret_key:
        abort(500, description="Missing HUME_API_KEY or HUME_SECRET_KEY. Please set them in the environment variables.")

    # Build Basic auth header
    auth = f"{api_key}:{secret_key}"
    encoded = base64.b64encode(auth.encode()).decode()

    # Request a client-credentials token
    try:
        resp = httpx.post(
            "https://api.hume.ai/oauth2-cc/token",
            headers={"Authorization": f"Basic {encoded}"},
            data={"grant_type": "client_credentials"},
            timeout=5.0
        )
        resp.raise_for_status()
    except httpx.HTTPError as e:
        abort(resp.status_code if resp else 502, description=str(e))

    data = resp.json()
    token = data.get("access_token")
    if not token:
        abort(502, description="No access_token in response")

    return jsonify(access_token=token)

if __name__ == "__main__":
    print("[WARNING] This access token service is for local testing with the example app only. For production, you must implement your own secure access token service.")
    app.run(host="0.0.0.0", port=8000)