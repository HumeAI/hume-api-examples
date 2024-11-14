from modal import Image, App, asgi_app
from app import eliza_app

# ------- MODAL --------
# deploy with `poetry run python -m modal deploy modal_app.py`


app = App("hume-eliza")
app.image = Image.debian_slim().pip_install("fastapi", "websockets")


@app.function()
@asgi_app()
def endpoint():
    return eliza_app
