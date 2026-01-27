import sys
import time
import os
import shutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from process import process_video

# Config
WATCH_EXTENSIONS = {'.mp4', '.mov', '.m4a', '.mp3', '.wav'}

class VideoHandler(FileSystemEventHandler):
    def __init__(self, watch_dir):
        self.watch_dir = watch_dir
        self.processed_dir = os.path.join(watch_dir, "processed")
        if not os.path.exists(self.processed_dir):
            os.makedirs(self.processed_dir)

    def on_created(self, event):
        if event.is_directory:
            return
        
        filename = os.path.basename(event.src_path)
        if filename.startswith('.'): # Ignore hidden files
            return

        ext = os.path.splitext(filename)[1].lower()
        if ext in WATCH_EXTENSIONS:
            print(f"\n[Detector] New file detected: {filename}")
            # Wait a bit to ensure file copy is complete
            time.sleep(2) 
            self.process_file(event.src_path)

    def process_file(self, file_path):
        print(f"Processing {file_path}...")
        success = process_video(file_path)
        
        if success:
            print(f"Moving {file_path} to processed folder.")
            filename = os.path.basename(file_path)
            dest_path = os.path.join(self.processed_dir, filename)
            # Handle duplicate names in processed folder
            if os.path.exists(dest_path):
                 base, ext = os.path.splitext(filename)
                 dest_path = os.path.join(self.processed_dir, f"{base}_{int(time.time())}{ext}")
            
            shutil.move(file_path, dest_path)
        else:
            print(f"Failed to process {file_path}. Keeping in place.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 watch.py <folder_to_watch>")
        print("Example: python3 watch.py ~/Downloads/meeting_videos")
        sys.exit(1)

    path = sys.argv[1]
    path = os.path.expanduser(path)
    
    if not os.path.exists(path):
        print(f"Error: Directory {path} does not exist.")
        sys.exit(1)

    event_handler = VideoHandler(path)
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()
    
    print(f"Monitoring directory: {path}")
    print(f"Supported extensions: {WATCH_EXTENSIONS}")
    print("Press Ctrl+C to stop.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
