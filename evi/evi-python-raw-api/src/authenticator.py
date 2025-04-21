# authenticator.py

import base64
import requests


class Authenticator:
    """
    A class to handle authentication with Hume AI's API via OAuth2.

    Attributes:
        api_key (str): The API key provided by Hume AI.
        secret_key (str): The secret key provided by Hume AI.
        host (str): The host URL of the API (default is "test-api.hume.ai").
    """

    def __init__(self, api_key: str, secret_key: str, host: str = "test-api.hume.ai"):
        """
        Initialize the Authenticator with the provided API key, Secret key, and host.

        Args:
            api_key (str): The API key provided by Hume AI.
            secret_key (str): The Secret key provided by Hume AI.
            host (str, optional): The host URL of the API. Defaults to "test-api.hume.ai".
        """
        self.api_key = api_key
        self.secret_key = secret_key
        self.host = host

    def fetch_access_token(self) -> str:
        """
        Fetch an access token from Hume AI's OAuth2 service.

        This method constructs the necessary headers and body for the OAuth2 client credentials
        grant, makes the POST request to the OAuth2 token endpoint, and extracts the access token
        from the response.

        Returns:
            str: The access token.

        Raises:
            ValueError: If the access token is not found in the response.
        """
        # Prepare the authorization string
        auth_string = f"{self.api_key}:{self.secret_key}"
        encoded = base64.b64encode(auth_string.encode()).decode()

        # Set up the headers
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {encoded}",
        }

        # Prepare the body
        data = {
            "grant_type": "client_credentials",
        }

        # Make the POST request to the OAuth2 token endpoint
        response = requests.post(
            f"https://{self.host}/oauth2-cc/token", headers=headers, data=data
        )

        # Parse the JSON response
        data = response.json()

        # Extract the access token, raise an error if not found
        if "access_token" not in data:
            raise ValueError("Access token not found in response")

        return data["access_token"]
