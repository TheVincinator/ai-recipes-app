# --- ingredient_icon_generator/icon_utils.py ---
from .main import get_ingredient_icon
from allergy_icon_locks import ALLERGY_ICON_LOCKS
import os

def allergy_async_generate_icon(app, name, category, image_path):
    # If the image already exists, skip generation
    if os.path.exists(image_path):
        if category:
            print(f"[INFO] Icon already exists for {name} ({category}), skipping generation.", flush=True)
        else:
            print(f"[INFO] Icon already exists for {name}, skipping generation.", flush=True)
        return

    lock_key = f"{name}_{category}" if category else name
    lock = ALLERGY_ICON_LOCKS[lock_key]
    
    with lock:
        with app.app_context():
            try:
                if category:
                    print(f"[DEBUG] Generating icon for {name} ({category}) → {image_path}", flush=True)
                else:
                    print(f"[DEBUG] Generating icon for {name} → {image_path}", flush=True)
                icon = get_ingredient_icon(name, category, size=256)
                icon.save(image_path)
                print(f"[SUCCESS] Icon saved to {image_path}", flush=True)
            except Exception as e:
                if category:
                    print(f"[ERROR] Failed to generate icon for {name} ({category}): {e}", flush=True)
                else:
                    print(f"[ERROR] Failed to generate icon for {name}: {e}", flush=True)


