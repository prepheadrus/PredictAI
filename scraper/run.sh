#!/bin/bash

# Set strict mode
set -euo pipefail

# --- Setup ---
VENV_DIR="scraper/.venv"
REQUIREMENTS_FILE="scraper/requirements.txt"
SCRIPT_FILE="scraper/main.py"
PYTHON_CMD="python3" # Use python3 as default

echo "--- BetWise Scraper Runner ---"

# --- 1. Check for Python ---
if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "❌ Error: Python 3 is not installed or not in PATH. Please install Python 3."
    exit 1
fi
echo "✅ Python 3 found."

# --- 2. Create and Activate Virtual Environment ---
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating Python virtual environment in '$VENV_DIR'..."
    $PYTHON_CMD -m venv "$VENV_DIR"
else
    echo "🐍 Virtual environment already exists."
fi

echo "Activating virtual environment..."
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

# --- 3. Install Dependencies ---
echo "📦 Installing dependencies from '$REQUIREMENTS_FILE'..."
pip install --upgrade pip > /dev/null
pip install -r "$REQUIREMENTS_FILE"
echo "✅ Dependencies installed."

# --- 4. Check for Chromium (for Google IDX / Nix environments) ---
# In Google IDX, Chromium needs to be available for Selenium to work.
# We check if 'chromium' is in the nix profile.
if command -v nix-env &> /dev/null; then
    echo "🔎 Checking for Chromium in Nix environment..."
    if ! nix-env -q | grep -q 'chromium'; then
        echo "⚠️ Warning: 'chromium' browser is not found in your Nix environment."
        echo "   The script might fail. To install it in Google IDX, add 'nix.pkgs.chromium' to your dev.nix file and rebuild the environment."
    else
        echo "✅ Chromium found."
    fi
fi

# --- 5. Run the Scraper Script ---
echo "🚀 Running the scraper script: '$SCRIPT_FILE'..."
echo "----------------------------------------------------"

$PYTHON_CMD "$SCRIPT_FILE"

echo "----------------------------------------------------"
echo "✅ Scraper script finished."

# --- 6. Deactivate Virtual Environment ---
deactivate
echo "🐍 Virtual environment deactivated."
echo "--- Run Complete ---"
