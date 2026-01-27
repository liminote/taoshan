import google.generativeai as genai
import os
import json

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')

with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

GOOGLE_API_KEY = config.get('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)

print("Listing supported models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
