from pathlib import Path

# Project root (where this script is located)
ROOT = Path(__file__).parent

# Folder structure
folders = [
    "app",
    "app/plugins",
    "web",
    "data",
]

# Files and their initial contents
files = {
    "app/__init__.py": "",

    "app/main.py": """from fastapi import FastAPI

app = FastAPI(
    title="Jarvis",
    version="0.1"
)

@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Jarvis",
        "version": "0.1"
    }
""",

    "app/brain.py": '''"""
Jarvis Brain
Main AI logic will live here.
"""
''',

    "app/memory.py": '''"""
Jarvis Memory
Stores and retrieves long-term memory.
"""
''',

    "web/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jarvis</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <h1>Jarvis</h1>
    <p>Hello, Sir.</p>

    <script src="script.js"></script>
</body>
</html>
""",

    "web/style.css": """body {
    font-family: Arial, sans-serif;
    background: #121212;
    color: white;
    text-align: center;
    padding-top: 100px;
}
""",

    "web/script.js": """console.log("Jarvis UI Loaded");""",

    "README.md": """# Jarvis

A personal AI assistant built with Python and FastAPI.
""",

    ".gitignore": """.venv/
__pycache__/
*.pyc
.env
""",

    "data/.gitkeep": "",
}


def create_structure():
    print("Creating folders...")
    for folder in folders:
        (ROOT / folder).mkdir(parents=True, exist_ok=True)

    print("Creating files...")
    for filename, content in files.items():
        path = ROOT / filename

        if not path.exists():
            path.write_text(content, encoding="utf-8")
            print(f"Created: {filename}")
        else:
            print(f"Skipped: {filename}")

    print("\nProject setup complete!")
    print("\nNext step:")
    print("Activate your virtual environment and run:")
    print("uvicorn app.main:app --reload")


if __name__ == "__main__":
    create_structure()