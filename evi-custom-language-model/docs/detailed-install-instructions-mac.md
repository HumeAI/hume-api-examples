To install the prerequisites listed in the README on a Mac, you'll need to use some package managers. Here are all the steps in case you don't have some of these installed:

### 1. **Install Homebrew**

Homebrew is a package manager for MacOS. If you don't have Homebrew installed, open Terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions to complete the installation.

### 2. **Install Python**

You can install the latest version of Python using Homebrew:

```bash
brew install python
```

This command installs Python 3 and its package manager `pip`, which you can use to install other Python packages.

### 3. **Install Poetry**

Poetry is a tool for dependency management and packaging in Python. To install Poetry, run:

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

This command downloads and runs the Poetry installer script.

After installing, you might need to add Poetry to your system's `PATH`. The installer will provide instructions on how to do this, or you can manually add the Poetry bin directory (typically `$HOME/.poetry/bin`) to your `PATH` in your `.zshrc` or `.bash_profile` file:

```bash
export PATH="$HOME/.poetry/bin:$PATH"
```

### 4. **Install Uvicorn**

Uvicorn is an ASGI server for running Python web apps. Since you've installed Python and Poetry, you can install Uvicorn using `poetry`. This step should not be necessary since `uvicorn` is already contained in the `pyproject.toml` file and will be installed in step 5 below, but in case you need to install it manually you can do so using the command:

```bash
poetry add uvicorn
```

Alternatively, since the project is already configured with Poetry and a `pyproject.toml` file listing Uvicorn as a dependency, you can install all project dependencies including Uvicorn by navigating to your project directory in the terminal and running:

```bash
poetry install
```

### 5. **Install Ngrok**

Ngrok is a tool that creates a secure tunnel to your localhost, making it accessible over the internet. To install Ngrok, first download it from [Ngrok's website](https://ngrok.com/download) or use Homebrew:

```bash
brew install --cask ngrok
```

After downloading, unzip the file (if you downloaded it from the website) and move `ngrok` to a location in your `PATH`.

### 6. Sign up for Ngrok and authenticate.

To use Ngrok, you'll need an authenticated account. You will need to both:

* Sign up for an account [here.](https://dashboard.ngrok.com/signup)
* Install your authtoken [here.](https://dashboard.ngrok.com/get-started/your-authtoken)

### 7. Activate the poetry Virtual Environment

You can activate the Poetry-managed virtual environment for your project, which will add the environment's bin directory to your `PATH`, making `uvicorn` and other package commands available:

```bash
poetry shell
```

After running this command, you should be able to run `uvicorn --version` or any other commands provided by packages within the virtual environment.

### 8. Sign up for SerpApi and add the API key to your `.env` file.

You can sign up for a free SerpApi key that is good for 100 free searches. Once you have done so, create (or edit if it already exists) the `.env` file in the root of the repository to add it.

* Sign up for an account [here.](https://serpapi.com/users/sign_up)

```text
SERPAPI_API_KEY=9a71b5441a2983748991d9e47b8aa54eb235f282d058e7e6d95dad854e315433

```
### 9. Sign up (if you haven't already) for an OpenAI API key and also add it to the `.env` file

Your `.env` file should look something like this:
```text
SERPAPI_API_KEY=9a71b5441a2983748991d9e47b8aa5482d058e7e6d95dad854e315433
OPENAI_API_KEY=sk-pFgGbNkxB95472398475932NLfT3BlbkFJBC6YKGKjjjjkHezP48ZK7

```

### Final Steps

After installing these prerequisites, verify the installations by checking the versions from your terminal:

- Check Python version: `python --version` or `python3 --version`
- Check Poetry version: `poetry --version`
- Check Uvicorn version: `uvicorn --version`
- Check Ngrok: `ngrok --version`

If each command returns a version number without error, you've successfully installed all the prerequisites on your Mac.