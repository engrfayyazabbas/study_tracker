import os
import webbrowser
from threading import Timer
from app import app, init_db

def open_browser():
    """Opens the default web browser to the app's local URL."""
    webbrowser.open_new('http://127.0.0.1:5000/')

if __name__ == "__main__":
    # Initialize the database
    init_db()
    
    # When debug=True, Flask's development server starts two processes 
    # (one main one, and one for the auto-reloader).
    # We check WERKZEUG_RUN_MAIN to ensure we only open the browser once.
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        # We use a 1.25 second delay to give the Flask server time to start up
        Timer(1.25, open_browser).start()

    print("Starting Study Tracker on local server...")
    
    # Start the Flask app
    app.run(host="127.0.0.1", port=5000, debug=True)
