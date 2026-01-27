import os
import sys
import json
import subprocess
import time
import requests
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')

if not os.path.exists(CONFIG_PATH):
    print(f"Error: Config file not found at {CONFIG_PATH}")
    print("Please copy config.json.example to config.json and fill in your API key.")
    sys.exit(1)

with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

GOOGLE_API_KEY = config.get('GOOGLE_API_KEY')
API_ENDPOINT = config.get('API_ENDPOINT')

if not GOOGLE_API_KEY or "YOUR_KEY" in GOOGLE_API_KEY:
    print("Error: Invalid Google API Key in config.json")
    sys.exit(1)

genai.configure(api_key=GOOGLE_API_KEY)

def extract_audio(video_path):
    """Extracts audio from video using ffmpeg."""
    filename = os.path.basename(video_path)
    audio_path = os.path.join(os.path.dirname(video_path), f"{os.path.splitext(filename)[0]}.mp3")
    
    print(f"Extracting audio to {audio_path}...")
    
    # Check if audio already exists to save time
    if os.path.exists(audio_path):
        print("Audio file already exists, skipping extraction.")
        return audio_path

    cmd = [
        'ffmpeg', '-i', video_path,
        '-q:a', '0', '-map', 'a',
        '-y', # Overwrite without asking
        audio_path
    ]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Audio extraction complete.")
        return audio_path
    except subprocess.CalledProcessError as e:
        print(f"Error extracting audio: {e}")
        # Try without -map a (sometimes videos don't have explicit audio streams in map 0)
        try:
             cmd = ['ffmpeg', '-i', video_path, '-vn', '-ab', '128k', '-y', audio_path]
             subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
             return audio_path
        except Exception as e2:
             print(f"Retry failed: {e2}")
             return None
    except FileNotFoundError:
        print("Error: ffmpeg not found. Please install ffmpeg using 'brew install ffmpeg'.")
        sys.exit(1)

def upload_to_gemini(path):
    """Uploads file to Gemini."""
    print(f"Uploading {path} to Gemini...")
    file = genai.upload_file(path, mime_type="audio/mp3")
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active."""
    print("Waiting for file processing...")
    for name in (file.name for file in files):
        file = genai.get_file(name)
        while file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
            file = genai.get_file(name)
        if file.state.name != "ACTIVE":
            raise Exception(f"File {file.name} failed to process")
    print("\nFile is ready.")

def generate_meeting_minutes(file):
    """Generates meeting minutes using Gemini."""
    print("Generating meeting minutes...")
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    prompt = """
    請分析這個會議音檔，並產出 JSON 格式的會議記錄。

    【重要規則】
    1. 人名修正：若聽到 "Louis" 請修正為 "Luis"，若聽到 "Alen" 請修正為 "Allen"。
    2. 風格要求：詳細、如實陳述，保留重要細節。
    3. 格式要求：請嚴格遵守以下 JSON 結構。

    請輸出一個 JSON 物件，包含以下欄位：
    1. meeting_date: 會議日期 (YYYY-MM-DD)，若無法判斷請回傳 null (或今日日期)。
    2. summary: 第一大項：會議摘要。約 200-300 字，描述核心討論事項。
    3. content: 第二大項：詳細會議內容。請使用「Markdown 條列式」呈現，**不要** 使用表格。盡量詳細記錄討論過程。
    4. tags: 相關標籤陣列 (例如: ["產品", "行銷"])。
    5. action_items: 第三大項：待辦事項陣列 (Action Items)。每個項目包含：
        - content: 事項內容
        - assignee: 負責人 (若無則為 null)
        - dueDate: 預計完成日 (必須是 YYYY-MM-DD 格式。若聽到「下週」、「盡快」等模糊時間，請回傳 null)
    
    確保 content 欄位是 Markdown 字串。確保 action_items 是完整的 JSON Array。
    請只回傳 JSON 字串，不要包含 markdown code block 標記。
    """

    response = model.generate_content(
        [file, prompt],
        request_options={"timeout": 600}
    )
    
    return response.text

def upload_to_website(data):
    """Uploads the result to the website API."""
    print(f"Uploading to {API_ENDPOINT}...")
    
    try:
        # Clean up JSON string if Gemini adds backticks
        json_str = data.replace('```json', '').replace('```', '').strip()
        payload = json.loads(json_str)
        
        # Ensure payload has required fields
        if 'content' not in payload:
            print("Error: Generated JSON missing 'content' field.")
            return False
            
        res = requests.post(API_ENDPOINT, json=payload)
        
        if res.status_code == 200:
            print("Successfully uploaded record!")
            print(f"Record ID: {res.json().get('id')}")
            return True
        else:
            print(f"Failed to upload. Status: {res.status_code}")
            print(f"Response: {res.text}")
            return False
            
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON from Gemini: {e}")
        print("Raw output:", data)
        return False
    except Exception as e:
        print(f"Error uploading: {e}")
        return False

def process_video(video_path):
    """Main processing logic for a single video."""
    if not os.path.exists(video_path):
        print(f"Error: File {video_path} not found.")
        return False

    # 1. Extract Audio
    audio_path = extract_audio(video_path)
    if not audio_path:
        return False

    try:
        # 2. Upload to Gemini
        file = upload_to_gemini(audio_path)
        wait_for_files_active([file])

        # 3. Generate Content
        result_text = generate_meeting_minutes(file)
        
        # 4. Upload to Website
        success = upload_to_website(result_text)
        return success

    except Exception as e:
        print(f"Error processing video: {e}")
        return False
    finally:
        # Optional: Clean up audio file
        if os.path.exists(audio_path):
            os.remove(audio_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 process.py <video_file_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    process_video(video_path)

if __name__ == "__main__":
    main()
