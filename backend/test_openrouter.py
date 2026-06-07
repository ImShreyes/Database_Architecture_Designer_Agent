import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "model": "stepfun/step-3.5-flash:free",
    "messages": [
        {"role": "user", "content": "Hello, are you working?"}
    ]
}

print(f"Testing OpenRouter API with key: {api_key[:10]}...")
try:
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=30)
    print("Status Code:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
