import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import os
from fuzzywuzzy import process
import argparse

# Config
CONFIG_FILE = 'object_detection/yolov3-spp.cfg'
WEIGHTS_FILE = 'object_detection/yolov3-spp.weights'
CLASSES_FILE = 'object_detection/coco.names'
PEXELS_API_KEY = "BbxBv38uCmX9EZHXSvt7ygFjzo6z0AaTBVA4MGa86UJ0Qk0JNZLyLVCU"
OUTPUT_FOLDER = "icons"
FONT_FILE = "fonts/Roboto-VariableFont_wdth,wght.ttf"

# Load YOLO
net = cv2.dnn.readNetFromDarknet(CONFIG_FILE, WEIGHTS_FILE)
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

# Load classes
with open(CLASSES_FILE, 'r') as f:
    classes = [line.strip() for line in f.readlines()]

# Predefined ingredients
ingredient_images = {
    "beans": "assets/beans.jpg",
    "butter": "assets/butter.jpg",
    "cheese": "assets/cheese.jpg",
    "eggs": "assets/eggs.jpg",
    "flour": "assets/flour.jpg",
    "garlic": "assets/garlic.jpg",
    "herbs": "assets/herbs.jpg",
    "meat": "assets/meat.jpg",
    "milk": "assets/milk.jpg",
    "oil": "assets/oil.jpg",
    "onions": "assets/onions.jpg",
    "rice": "assets/rice.jpg",
    "salt": "assets/salt.jpg",
    "spices": "assets/spices.jpg",
    "sugar": "assets/sugar.jpg",
    "tomatoes": "assets/tomatoes.jpg",
    "vegetables": "assets/vegetables.jpg",
    "vinegar": "assets/vinegar.jpg",
    "water": "assets/water.jpg",
}

# === Functions / Helper Functions ===

def get_pexels_image(query, api_key):
    """
    Fetch an image from the Pexels API based on a search query.
    """
    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=1"

    response = requests.get(url, headers=headers, timeout=10)

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    if data.get("photos"):
        return data["photos"][0]["src"]["original"]
    else:
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


def create_icons_empty_boxes(size, image_url):
    """
    Create an icon from the original image if no objects were detected.
    """
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content)).convert("RGBA")

    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    img = img.crop((left, top, right, bottom))

    img = img.resize((size, size), Image.LANCZOS)

    return img


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
    if score > 80:
        return match
    return None


def fetch_or_create_icon(keyword, size):
    """
    Fetches or generates an icon based on the keyword.
    """
    image_url = get_pexels_image(keyword, PEXELS_API_KEY)

    if not image_url:
        return create_icons_no_url(keyword, size)

    boxes, confidences, pil_image = detect_objects(image_url, keyword)

    if len(boxes) == 0:
        return create_icons_empty_boxes(size, image_url)
    
    return create_icons_boxes(boxes, confidences, pil_image, size)


def get_ingredient_icon(user_input, size=256):
    """
    Retrieve an icon for an ingredient, either from local assets or online.
    """
    try:    
        best_match = find_best_match(user_input.lower(), ingredient_images.keys())

        if best_match:
            local_path = ingredient_images[best_match]
            if os.path.exists(local_path):
                return Image.open(local_path).resize((size, size))

        best_match = find_best_match(user_input.lower(), classes)

        if best_match:
            return fetch_or_create_icon(best_match, size)
        else:
            return fetch_or_create_icon(user_input, size)

    except Exception as e:
        return create_icons_no_url("Error finding image", size)


def user_input_flow(user_input, textbox_id):
    """
    Helper function for the main method that controls the user's arguments
    """
    query = user_input

    if query.strip():
        icon = get_ingredient_icon(query)

        if not os.path.exists(OUTPUT_FOLDER):
            os.makedirs(OUTPUT_FOLDER)

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
