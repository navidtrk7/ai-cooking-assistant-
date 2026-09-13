import uvicorn
import sys
import os

# Add workspace directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, parent_dir)

if __name__ == "__main__":
    uvicorn.run(
        "apps.api.app.main:app",
        host="0.0.0.0",
        port=8200,
        reload=True
    )

