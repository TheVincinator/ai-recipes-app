import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import os
from fuzzywuzzy import process
import argparse
from dotenv import load_dotenv

load_dotenv()

# Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'object_detection/yolov3-spp.cfg')
WEIGHTS_FILE = os.path.join(BASE_DIR, 'object_detection/yolov3-spp.weights')
CLASSES_FILE = os.path.join(BASE_DIR, 'object_detection/coco.names')
OUTPUT_FOLDER = os.path.join(BASE_DIR, "assets/ingredients/generated_images")
FONT_FILE = os.path.join(BASE_DIR, "fonts/Roboto-VariableFont_wdth,wght.ttf")

PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")

# --- Download YOLO weights from S3 if not present ---
if not os.path.exists(WEIGHTS_FILE):
    os.makedirs(os.path.dirname(WEIGHTS_FILE), exist_ok=True)
    s3_url = "https://ai-recipes-backend-models.s3.us-east-2.amazonaws.com/yolov3-spp.weights"  # Replace with your S3 URL
    r = requests.get(s3_url, stream=True)
    with open(WEIGHTS_FILE, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

# Load YOLO
net = cv2.dnn.readNetFromDarknet(CONFIG_FILE, WEIGHTS_FILE)
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

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


def detect_objects(image_url, user_input):
    """
    Detect objects matching the user input in an image.
    """
    response = requests.get(image_url)
    pil_image = Image.open(BytesIO(response.content)).convert("RGB")
    img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)

    outs = net.forward(output_layers)

    class_ids = []
    confidences = []
    boxes = []
    height, width, _ = img.shape

    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            if confidence > 0.5 and classes[class_id].lower() == user_input.lower():
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)

                x = int(center_x - w / 2)
                y = int(center_y - h / 2)

                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)

    indices = cv2.dnn.NMSBoxes(boxes, confidences, score_threshold=0.5, nms_threshold=0.4)

    filtered_boxes = []
    filtered_confidences = []
    filtered_class_ids = []

    for i in indices:
        i = i[0] if isinstance(i, (list, tuple, np.ndarray)) else i
        filtered_boxes.append(boxes[i])
        filtered_confidences.append(confidences[i])
        filtered_class_ids.append(class_ids[i])

    return filtered_boxes, filtered_confidences, filtered_class_ids, pil_image


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
    match, score = process.extractOne(user_input, options)
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

    boxes, confidences, _, pil_image = detect_objects(image_url, keyword)

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


def user_input_flow(user_input, textbox_id):
    """
    Helper function for the main method that controls the user's arguments
    """
    query = user_input

    if query.strip():
        icon = get_ingredient_icon(query)

        filename = os.path.join(OUTPUT_FOLDER, f"ingredient_{textbox_id}.png")

        if os.path.exists(filename):
            os.remove(filename)

        icon.save(filename)

# === Main Usage ===

def main():
    """
    Main entry point for generating ingredient icons based on user input.

    Sets up argument parsing to receive the ingredient query and a unique ID for the query's textbox.
    Then, it calls the `user_input_flow` function to process the user input and save the generated icon.
    """
    parser = argparse.ArgumentParser(description="Generate ingredient icons based on user input.")
    parser.add_argument('user_input', type=str, help="The ingredient name or query.")
    parser.add_argument('textbox_id', type=int, help="A unique ID for the textbox or query.")

    args = parser.parse_args()

    user_input_flow(args.user_input, args.textbox_id)

if __name__ == "__main__":
    main()
