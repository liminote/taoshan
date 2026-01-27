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
    # Use hidden file to prevent watcher from triggering
    audio_path = os.path.join(os.path.dirname(video_path), f".{os.path.splitext(filename)[0]}.mp3")
    
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
    # Update to available model
    model = genai.GenerativeModel(model_name="gemini-flash-latest")

    prompt = """
    請分析這個會議音檔，並產出 JSON 格式的會議記錄。

    【重要規則】
    1. 人名修正：
       - 若聽到 "Louis" 請修正為 "Luis"
       - 若聽到 "Alen" 請修正為 "Allen"
       - 若聽到 "美豬" 請修正為 "美珠"
    2. 風格要求：
       - 如實陳述，不要加油添醋，不要廢話。
    3. **待辦事項 (Action Items) 定義 (關鍵)**：
       - 凡是會議中提到的 **「承諾」(promises)**、**「要求」(requirements)**、**「決議」(decisions)** 或 **「預計完成」** 的事項，**無論原本在會議內容中有沒有提到，都必須「額外」提取並放入 `action_items` 陣列中**。
       - 請將對話轉化為具體的執行指令 (例如：「Allen 說他會去教...」 -> 「教導新進員工流程」)。

    【JSON 輸出格式要求】
    請嚴格遵守以下 JSON 結構回傳 (不要 Markdown Code Block)：
    {
      "meeting_date": "YYYY-MM-DD (若無法判斷請填 null)",
      "summary": "100-200字摘要",
      "content": "Markdown 條列式詳細內容 (不要用表格)",
      "tags": ["tag1", "tag2"],
      "action_items": [
        {
          "content": "待辦事項內容",
          "assignee": "負責人 (例如 Allen)",
          "dueDate": "YYYY-MM-DD (需推算具體日期，若無明確時間請填 null)"
        }
      ]
    }
    """

    retry_count = 0
    max_retries = 5
    while retry_count < max_retries:
        try:
            response = model.generate_content(
                [file, prompt],
                request_options={"timeout": 600}
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "ResourceExhausted" in str(e):
                print(f"Quota limit hit, waiting 60 seconds to retry... ({retry_count + 1}/{max_retries})")
                time.sleep(60)
                retry_count += 1
            else:
                raise e
    
    raise Exception("Max retries exceeded for API quota.")

def upload_to_website(data, filename_date=None):
    """Uploads the result to the website API."""
    print(f"Uploading to {API_ENDPOINT}...")
    
    try:
        # Clean up JSON string if Gemini adds backticks
        json_str = data.replace('```json', '').replace('```', '').strip()
        # Parse with strict=False to allow control characters (newlines) in strings
        payload = json.loads(json_str, strict=False)
        
        # Override meeting_date if provided from filename
        if filename_date:
            payload['meeting_date'] = filename_date
            print(f"Using date from filename: {filename_date}")
        
        # Append Action Items to Content for display in record
        if 'action_items' in payload and payload['action_items']:
            action_items_md = "\n\n### 第三大項：待辦事項\n"
            today_str = time.strftime('%Y-%m-%d')
            meeting_date = payload.get('meeting_date') or today_str
            meeting_year = meeting_date.split('-')[0]

            for item in payload['action_items']:
                # Sanitize values for API (DB likely rejects nulls)
                if not item.get('assignee'):
                    item['assignee'] = '待分配'
                
                if not item.get('dueDate'):
                    item['dueDate'] = meeting_date
                else:
                    # Fix Hallucinated Years (e.g., AI says 2024/2025 but it is 2026)
                    d_date = item['dueDate']
                    if d_date and d_date.startswith('202') and not d_date.startswith(meeting_year):
                         # Replace year with meeting year
                         fixed_date = meeting_year + d_date[4:]
                         print(f"Fixed date year: {d_date} -> {fixed_date}")
                         item['dueDate'] = fixed_date


                content = item.get('content', '')
                assignee = item['assignee']
                due_date = item['dueDate']
                created_date = meeting_date
                
                # Format: 內容 ｜ 負責人 ｜ 預計完成時間 ｜ 建立時間
                action_items_md += f"- {content} ｜ {assignee} ｜ {due_date} ｜ {created_date}\n"
            
            payload['content'] = payload.get('content', '') + action_items_md
        
        # Ensure payload has required fields
        if 'content' not in payload:
            print("Error: Generated JSON missing 'content' field.")
            return False
            
        res = requests.post(API_ENDPOINT, json=payload)
        
        if res.status_code == 200:
            resp_json = res.json()
            print("Successfully uploaded record!")
            print(f"Record ID: {resp_json.get('id')}")
            
            if resp_json.get('syncError'):
                print(f"⚠️ Warning: Action Items Sync Failed! Error: {resp_json.get('syncError')}")
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
        
        # Failsafe: Save to local file if upload fails
        try:
            timestamp = int(time.time())
            backup_file = f"backup_meeting_record_{timestamp}.json"
            clean_data = data.replace('```json', '').replace('```', '').strip()
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(clean_data)
            print(f"⚠️  Backup: Saved meeting record to {backup_file} locally.")
        except Exception as backup_error:
            print(f"Failed to save backup: {backup_error}")
            
        return False

import re
def extract_date_from_filename(filename):
    """Extracts date (YYYY-MM-DD) from filename if exists."""
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    return match.group(1) if match else None

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
        # Extract date from filename to force correct date
        filename = os.path.basename(video_path)
        filename_date = extract_date_from_filename(filename)
        
        success = upload_to_website(result_text, filename_date)
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
