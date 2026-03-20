from ultralytics import YOLO
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import os
from fuzzywuzzy import process
from dotenv import load_dotenv
import torch

load_dotenv()

# Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = 'object_detection/yolov8n.pt'
CLASSES_FILE = os.path.join(BASE_DIR, 'object_detection/coco.names')
OUTPUT_FOLDER = os.path.join(BASE_DIR, "assets/ingredients/generated_images")
FONT_FILE = os.path.join(BASE_DIR, "fonts/Roboto-VariableFont_wdth,wght.ttf")

PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")

# ⭐ Add safe globals for PyTorch 2.6+
try:
    from ultralytics.nn.tasks import DetectionModel
    torch.serialization.add_safe_globals([
        DetectionModel,
        torch.nn.modules.container.Sequential,
        torch.nn.modules.conv.Conv2d,
        torch.nn.modules.batchnorm.BatchNorm2d,
        torch.nn.modules.activation.SiLU,
        torch.nn.modules.pooling.MaxPool2d,
        torch.nn.modules.upsampling.Upsample
    ])
except Exception as e:
    print(f"[YOLO WARNING] Could not add safe globals: {e}", flush=True)

# Load YOLO - safe globals registered above are sufficient for PyTorch 2.6+
try:
    net = YOLO(MODEL_FILE)
except Exception as e:
    print(f"[YOLO ERROR] Failed to load model: {e}", flush=True)
    net = None

# Load classes
with open(CLASSES_FILE, 'r') as f:
    classes = [line.strip() for line in f.readlines()]

# === Functions / Helper Functions ===

def get_pixabay_image(query, category, api_key):
    """
    Fetch an image URL from the Pixabay API based on a search query.
    """
    if category:
        query = f"{query} {category}"
        
    url = f"https://pixabay.com/api/?key={api_key}&q={requests.utils.quote(query)}&image_type=photo&category=food&per_page=3"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None
        data = response.json()
        if data.get("hits") and len(data["hits"]) > 0:
            # Return the first image's large image URL (webformatURL or largeImageURL)
            return data["hits"][0].get("largeImageURL") or data["hits"][0].get("webformatURL")
        else:
            return None
    except Exception:
        return None


def detect_objects_ultralytics(image_url, user_input):
    """
    Detect objects in the image that match the user_input, using Ultralytics YOLO.
    """
    if net is None:
        print(f"[DETECT ERROR] YOLO model is None!", flush=True)
        response = requests.get(image_url)
        pil_image = Image.open(BytesIO(response.content)).convert("RGB")
        return [], [], [], pil_image

    try:
        response = requests.get(image_url)
        pil_image = Image.open(BytesIO(response.content)).convert("RGB")
        img_np = np.array(pil_image)
        results = net.predict(img_np, verbose=False)

        boxes = []
        confidences = []
        class_ids = []

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                score = float(box.conf[0])
                detected_class = classes[cls_id].lower() if cls_id < len(classes) else "unknown"

                similarity = process.extractOne(user_input.lower(), [detected_class])
                fuzzy_score = similarity[1] if similarity else 0
                if score > 0.5 and fuzzy_score >= 60:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    boxes.append([x1, y1, x2 - x1, y2 - y1])
                    confidences.append(score)
                    class_ids.append(cls_id)

        return boxes, confidences, class_ids, pil_image

    except Exception as e:
        print(f"[DETECT ERROR] Exception: {type(e).__name__}: {e}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)
        raise


def create_icons_no_url(text, size):
    """
    Create an icon displaying text if no image URL was found.
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    draw = ImageDraw.Draw(img)

    font_size = size // 4
    font = ImageFont.truetype(FONT_FILE, font_size)

    while True:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        if text_width <= size and text_height <= size:
            break

        font_size -= 1
        font = ImageFont.truetype(FONT_FILE, font_size)

    position = ((size - text_width) // 2, (size - text_height) // 2)

    draw.text(position, text, font=font, fill=(0, 0, 0, 255))

    return img


def create_icons_empty_boxes(size, pil_image):
    """
    Create an icon from the original image if no objects were detected.
    """
    width, height = pil_image.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    pil_image = pil_image.crop((left, top, right, bottom))

    pil_image = pil_image.resize((size, size), Image.LANCZOS)

    return pil_image


def create_icons_boxes(boxes, confidences, pil_image, size):
    """
    Creates icons if one or more objects are detected in the image.
    """
    best_idx = np.argmax(confidences)
    x, y, w, h = boxes[best_idx]

    center_x = x + w // 2
    center_y = y + h // 2
    side_length = max(w, h)

    left = center_x - side_length // 2
    top = center_y - side_length // 2
    right = left + side_length
    bottom = top + side_length

    left = max(0, left)
    top = max(0, top)
    right = min(pil_image.width, right)
    bottom = min(pil_image.height, bottom)

    square_crop = pil_image.crop((left, top, right, bottom))
    resized_icon = square_crop.resize((size, size), Image.LANCZOS)

    return resized_icon


def find_best_match(user_input, options):
    """
    Finds the best matching word if the word differs slightly or if there was a typo.
    """
    if not options:
        return None

    result = process.extractOne(user_input, options)
    if result is None:
        return None

    match, score = result
    if score > 90:
        return match
    return None


def fetch_or_create_icon(keyword, category, size):
    """
    Fetches or generates an icon based on the keyword.
    """
    image_url = get_pixabay_image(keyword, category, PIXABAY_API_KEY)

    if not image_url:
        return create_icons_no_url(keyword, size)

    boxes, confidences, _, pil_image = detect_objects_ultralytics(image_url, keyword)

    if len(boxes) == 0:
        return create_icons_empty_boxes(size, pil_image)
    
    return create_icons_boxes(boxes, confidences, pil_image, size)


def get_ingredient_icon(user_input, category, size=256):
    """
    Retrieve an icon for an ingredient, either from local assets or online.
    """
    try:    
        best_match = find_best_match(user_input.lower(), classes)

        if best_match:
            return fetch_or_create_icon(best_match, category, size)
        else:
            return fetch_or_create_icon(user_input, category, size)

    except Exception as e:
        return create_icons_no_url("Error finding image", size)


