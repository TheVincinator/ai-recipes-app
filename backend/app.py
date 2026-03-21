from flask import Flask, request, jsonify, send_from_directory
from db import db, User, Ingredient, Allergy, Recipe
import requests
import json
from dotenv import load_dotenv
import os
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from claude_icon_utils import (
    generate_icon,
    cleanup_icon_if_unused,
)
from cloud_storage_config import storage
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from sqlalchemy import text
import anthropic
import base64


app = Flask(__name__)

app.url_map.strict_slashes = False

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://"
)

_cors_origins = os.getenv(
    'CORS_ORIGINS',
    'https://ai-recipes-app-amber.vercel.app,http://localhost:3000'
).split(',')
CORS(app, origins=_cors_origins)

# Config
# Only load .env in development
if os.getenv('ENV') != 'production':
    load_dotenv()

# Validate required environment variables in production
IS_PRODUCTION = os.getenv('ENV') == 'production'
if IS_PRODUCTION:
    for var in ('JWT_SECRET_KEY', 'DATABASE_URL', 'ANTHROPIC_API_KEY', 'USE_CLOUD_STORAGE'):
        if not os.getenv(var):
            raise RuntimeError(f"Required environment variable {var} is not set")

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

jwt_secret = os.getenv('JWT_SECRET_KEY')
if not jwt_secret:
    jwt_secret = 'dev-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = jwt_secret
app.config['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY')

# Initialize the database
db.init_app(app)
with app.app_context():
    db.create_all()


def failure_response(message, code=404):
    return json.dumps({"success": False, "error": message}), code, {'Content-Type': 'application/json'}


def success_response(data, code=200):
    return json.dumps({"success": True, "data": data}), code, {'Content-Type': 'application/json'}


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')


def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def authorize_user(f):
    @wraps(f)
    def decorated(current_user_id, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None and current_user_id != user_id:
            return failure_response("Unauthorized access", 403)
        return f(current_user_id, *args, **kwargs)
    return decorated


def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return failure_response('Token is missing', 401)
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_token(token)
        if user_id is None:
            return failure_response('Invalid or expired token', 401)
        
        return f(user_id, *args, **kwargs)
    return decorated_function


# User Routes
@app.route('/api/users/', methods=['POST'])
@limiter.limit("5 per minute")
def create_user():
    body = request.get_json(silent=True)
    
    if not body or not body.get('username') or not body.get('email') or not body.get('password'):
        return failure_response('Missing required fields', 400)

    if len(body['username']) > 50:
        return failure_response('Username must be 50 characters or fewer', 400)
    if len(body['email']) > 255:
        return failure_response('Email must be 255 characters or fewer', 400)
    if len(body['password']) > 128:
        return failure_response('Password must be 128 characters or fewer', 400)

    if User.query.filter_by(username=body['username']).first():
        return failure_response('Username already exists', 409)
        
    if User.query.filter_by(email=body['email']).first():
        return failure_response('Email already exists', 409)
    
    new_user = User(
        username=body['username'],
        email=body['email']
    )
    new_user.set_password(body['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    token = generate_token(new_user.id)
    return success_response({
        'token': token,
        'user': new_user.to_dict()
    }, 201)


@app.route('/api/users/<int:user_id>/')
@token_required
@authorize_user
def get_user(current_user_id, user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    return success_response(user.to_dict())


@app.route('/api/users/<int:user_id>/', methods=['PUT'])
@token_required
@authorize_user
def update_user(current_user_id, user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    body = request.get_json(silent=True)
    
    if 'username' in body:
        existing_user = User.query.filter_by(username=body['username']).first()
        if existing_user and existing_user.id != user_id:
            return failure_response('Username already exists', 409)
        user.username = body['username']
        
    if 'email' in body:
        existing_user = User.query.filter_by(email=body['email']).first()
        if existing_user and existing_user.id != user_id:
            return failure_response('Email already exists', 409)
        user.email = body['email']
        
    if 'password' in body:
        user.set_password(body['password'])
    
    db.session.commit()
    return success_response(user.to_dict())


@app.route('/api/users/<int:user_id>/', methods=['DELETE'])
@token_required
@authorize_user
def delete_user(current_user_id, user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    # Gather ingredient and allergy data BEFORE deletion
    ingredient_data = [(ing.name.lower(), ing.category.lower() if ing.category else None) for ing in user.ingredients]
    allergy_data = [(al.allergy_name.lower(), al.allergy_category.lower() if al.allergy_category else None) for al in user.allergies]

    db.session.delete(user)
    db.session.commit()

    for name, category in ingredient_data:
        cleanup_icon_if_unused(name, category, 'ingredient', Ingredient, 'name')

    for name, category in allergy_data:
        cleanup_icon_if_unused(name, category, 'allergy', Allergy, 'allergy_name')

    return success_response(user.to_dict())


# Allergy Routes
@app.route('/api/users/<int:user_id>/allergies/', methods=['POST'])
@token_required
@authorize_user
def add_allergy_for_user(current_user_id, user_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    body = request.get_json(silent=True)

    if not body or not body.get('allergy_name'):
        return failure_response('Allergy name is required', 400)
    
    name = body['allergy_name'].strip().lower()
    category = body.get('allergy_category', '').strip().lower()

    # Create database entry
    new_allergy = Allergy(
        allergy_name=name,
        allergy_category=category,
        user_id=user_id
    )
    db.session.add(new_allergy)
    db.session.commit()

    if not body.get('skip_icon'):
        generate_icon(name, category, 'allergy')

    return success_response(new_allergy.to_dict(), 201)


@app.route('/api/users/<int:user_id>/allergies/<int:allergy_id>/', methods=['PUT'])
@token_required
@authorize_user
def update_allergy_for_user(current_user_id, user_id, allergy_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    allergy = Allergy.query.filter_by(id=allergy_id, user_id=user_id).first()
    if allergy is None:
        return failure_response("Allergy not found")

    body = request.get_json(silent=True)

    old_name = allergy.allergy_name.lower()
    old_category = allergy.allergy_category.lower() if allergy.allergy_category else ''
    
    new_name = body.get('allergy_name', '').strip().lower()
    new_category = body.get('allergy_category', '').strip().lower()

    if not new_name:
        return failure_response("Allergy name is required", 400)
    
    allergy.allergy_name = new_name
    allergy.allergy_category = new_category
    db.session.commit()

    if new_name != old_name or new_category != old_category:
        cleanup_icon_if_unused(old_name, old_category, 'allergy', Allergy, 'allergy_name')
        delete_user_scan_icon(user_id, old_name, old_category, 'allergies')
        generate_icon(new_name, new_category, 'allergy')

    return success_response(allergy.to_dict())


@app.route('/api/users/<int:user_id>/allergies/<int:allergy_id>/', methods=['DELETE'])
@token_required
@authorize_user
def delete_allergy_for_user(current_user_id, user_id, allergy_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")
    
    allergy = Allergy.query.filter_by(id=allergy_id, user_id=user_id).first()
    if allergy is None:
        return failure_response("Allergy not found")
    
    name = allergy.allergy_name.lower()
    category = allergy.allergy_category.lower() if allergy.allergy_category else ''

    # Delete the allergy
    db.session.delete(allergy)
    db.session.commit()

    cleanup_icon_if_unused(name, category, 'allergy', Allergy, 'allergy_name')

    # Always delete this user's personal scan icon
    delete_user_scan_icon(user_id, name, category, 'allergies')

    return success_response(allergy.to_dict())


@app.route('/api/users/<int:user_id>/allergies/')
@token_required
@authorize_user
def get_allergies_for_user(current_user_id, user_id):
    user = User.query.get(user_id)
    if not user:
        return failure_response('User not found')

    allergies = Allergy.query.filter_by(user_id=user_id).all()
    return success_response([allergy.to_dict() for allergy in allergies])


# Ingredient Routes
@app.route('/api/users/<int:user_id>/ingredients/', methods=['POST'])
@token_required
@authorize_user
def add_ingredient(current_user_id, user_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    body = request.get_json(silent=True)
    
    if not body or not body.get('name'):
        return failure_response('Ingredient name is required', 400)

    name = body['name'].strip().lower()
    category = body.get('category', '').strip().lower()

    # Create database entry
    new_ingredient = Ingredient(
        name=name,
        quantity=body.get('quantity', 0),
        unit=body.get('unit', 'units'),
        category=category,
        user_id=user_id,
    )
    db.session.add(new_ingredient)
    db.session.commit()

    if not body.get('skip_icon'):
        generate_icon(name, category, 'ingredient')

    return success_response(new_ingredient.to_dict(), 201)


@app.route('/api/users/<int:user_id>/ingredients/')
@token_required
@authorize_user
def get_user_ingredients(current_user_id, user_id):
    if User.query.get(user_id) is None:
        return failure_response("User not found")
    
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    return success_response([ingredient.to_dict() for ingredient in ingredients])


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/')
@token_required
@authorize_user
def get_ingredient(current_user_id, user_id, ingredient_id):
    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()

    if ingredient is None:
        return failure_response("Ingredient not found or does not belong to user")
    
    return success_response(ingredient.to_dict())


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/', methods=['PUT'])
@token_required
@authorize_user
def update_ingredient(current_user_id, user_id, ingredient_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()
    if ingredient is None:
        return failure_response("Ingredient not found")

    body = request.get_json(silent=True)

    old_name = ingredient.name.lower()
    old_category = ingredient.category.lower() if ingredient.category else ''
    
    new_name = body.get('name', '').strip().lower()
    new_category = body.get('category', '').strip().lower()

    if not new_name:
        return failure_response("Ingredient name is required", 400)

    # Update fields
    ingredient.name = new_name
    ingredient.category = new_category
    ingredient.quantity = body.get('quantity', ingredient.quantity)
    ingredient.unit = body.get('unit', ingredient.unit)
    
    db.session.commit()

    if new_name != old_name or new_category != old_category:
        cleanup_icon_if_unused(old_name, old_category, 'ingredient', Ingredient, 'name')
        delete_user_scan_icon(user_id, old_name, old_category, 'ingredients')
        generate_icon(new_name, new_category, 'ingredient')

    return success_response(ingredient.to_dict(), 200)


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/', methods=['DELETE'])
@token_required
@authorize_user
def delete_ingredient(current_user_id, user_id, ingredient_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")
    
    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()
    if not ingredient:
        return failure_response("Ingredient not found")

    ingredient_name = ingredient.name.lower()
    ingredient_category = ingredient.category.lower() if ingredient.category else ''
    
    # Delete the ingredient
    db.session.delete(ingredient)
    db.session.commit()
    
    cleanup_icon_if_unused(ingredient_name, ingredient_category, 'ingredient', Ingredient, 'name')

    # Always delete this user's personal scan icon
    delete_user_scan_icon(user_id, ingredient_name, ingredient_category, 'ingredients')

    return success_response(ingredient.to_dict())


# Asset Serving Routes
@app.route('/api/assets/<string:asset_type>/generated_images/<string:combined>')
def get_generated_image(asset_type, combined):
    """Serve generated icons (SVG from Claude or PNG scan icons) from cloud or local storage."""
    if asset_type not in ('ingredients', 'allergies'):
        return '', 404

    if storage.use_cloud:
        for ext, ct in [('.svg', 'image/svg+xml'), ('.png', 'image/png')]:
            r = requests.get(storage.get_url(f"{asset_type}/generated_images/{combined}{ext}"))
            if r.status_code == 200:
                return r.content, 200, {'Content-Type': ct, 'Cache-Control': 'no-cache'}
    else:
        for ext in ('.svg', '.png'):
            path = os.path.join('ingredient_icon_generator', 'assets',
                                asset_type, 'generated_images', f"{combined}{ext}")
            if os.path.exists(path):
                return send_from_directory(
                    f'ingredient_icon_generator/assets/{asset_type}/generated_images',
                    f"{combined}{ext}"
                )

    return '', 404


# Search Route
@app.route('/api/users/<int:user_id>/ingredients/search/')
@token_required
@authorize_user
def search_ingredients(current_user_id, user_id):
    if User.query.get(user_id) is None:    # Check if user exists
        return failure_response("User not found")
    
    query = request.args.get('q', '')
    category = request.args.get('category')
    
    ingredients_query = Ingredient.query.filter_by(user_id=user_id)
    
    if query:
        ingredients_query = ingredients_query.filter(Ingredient.name.like(f'%{query}%'))
    
    if category:
        ingredients_query = ingredients_query.filter_by(category=category)
    
    ingredients = ingredients_query.all()
    return success_response([ingredient.to_dict() for ingredient in ingredients])


# Authentication Route
@app.route('/api/auth/login/', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    body = request.get_json(silent=True)
    
    if not body or not body.get('username') or not body.get('password'):
        return failure_response('Missing username or password', 400)
    
    user = User.query.filter_by(username=body['username']).first()
    
    if not user or not user.check_password(body['password']):
        return failure_response('Invalid username or password', 401)
    
    token = generate_token(user.id)
    return success_response({
        'token': token,
        'user': user.to_dict()
    })


@app.route('/api/auth/logout/', methods=['POST'])
def logout():
    # If using sessions, you'd clear the session here.
    # For JWT, you might blacklist the token or just rely on token expiry.
    return success_response('Logged out successfully')


# Recipe suggestion route using AI
@app.route('/api/users/<int:user_id>/recipe-suggestions/')
@token_required
@authorize_user
def get_recipe_suggestions(current_user_id, user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    allergies = Allergy.query.filter_by(user_id=user_id).all()
    
    if not ingredients:
        return failure_response('No ingredients found for this user')
    
    # Optional filters — whitelist to prevent prompt injection
    VALID_MEAL_TYPES = {'breakfast', 'lunch', 'dinner', 'snack', 'dessert'}
    VALID_CUISINES = {'american', 'italian', 'mexican', 'chinese', 'indian', 'french', 'japanese'}
    VALID_DIETS = {'vegetarian', 'vegan', 'gluten-free', 'keto', 'pescatarian'}

    raw_meal_type = request.args.get('meal_type', '').strip().lower()
    raw_cuisine = request.args.get('cuisine', '').strip().lower()
    raw_diet = request.args.get('diet', '').strip().lower()

    meal_type = raw_meal_type if raw_meal_type in VALID_MEAL_TYPES else ''
    cuisine = raw_cuisine if raw_cuisine in VALID_CUISINES else ''
    diet = raw_diet if raw_diet in VALID_DIETS else ''
    
    # 🔹 Use helper function
    prompt = build_recipe_prompt(
        ingredients=ingredients,
        allergies=allergies,
        meal_type=meal_type,
        cuisine=cuisine,
        diet=diet
    )

    try:
        client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        recipes = response.content[0].text
        return success_response({
            'ingredients_used': [i.name for i in ingredients],
            'recipes': recipes,
            'filters': {
                'meal_type': meal_type,
                'cuisine': cuisine,
                'diet': diet
            }
        })
    except Exception:
        return failure_response('Error generating recipes', 500)
    

def build_recipe_prompt(ingredients, allergies, meal_type=None, cuisine=None, diet=None):
    # Ingredient descriptions
    ingredient_descriptions = []
    for ing in ingredients:
        if ing.quantity is not None and ing.unit:
            desc = f"{ing.quantity} {ing.unit} of {ing.name}"
        elif ing.quantity is not None:
            desc = f"{ing.quantity} {ing.name}"
        else:
            desc = ing.name
        if ing.category:
            desc += f" ({ing.category})"
        ingredient_descriptions.append(desc)

    prompt = f"I have the following ingredients: {', '.join(ingredient_descriptions)}."
    prompt += " Suggest a few recipes using these ingredients."

    # Allergies
    if allergies:
        allergy_descriptions = []
        for allergy in allergies:
            desc = allergy.allergy_name
            if allergy.allergy_category:
                desc += f" ({allergy.allergy_category})"
            allergy_descriptions.append(desc)
        prompt += f" You must strictly exclude any recipes containing these allergens — do not suggest them even with caveats or disclaimers: {', '.join(allergy_descriptions)}."

    # Optional filters
    if meal_type:
        prompt += f" The meal type should be {meal_type}."
    if cuisine:
        prompt += f" The cuisine preference is {cuisine}."
    if diet:
        prompt += f" The recipes should follow a {diet} diet."

    prompt += " For each recipe provide: a name, ingredient list with quantities, step-by-step instructions, and a nutritional estimate per serving formatted exactly as: **Nutrition (per serving):** ~X cal | Xg protein | Xg carbs | Xg fat. Do not ask follow-up questions or suggest modifications at the end."

    return prompt


def delete_user_scan_icon(user_id, name, category, asset_type):
    """Delete the user-specific scan icon from storage, if it exists."""
    combined = f"{name}_{category}" if category else name
    key = f"{asset_type}/generated_images/{user_id}_{combined}.png"
    storage.delete(key)


@app.route('/api/assets/<string:asset_type>/upload-icon/', methods=['POST'])
@token_required
def upload_scan_icon(current_user_id, asset_type):
    if asset_type not in ('ingredients', 'allergies'):
        return failure_response('Invalid asset type', 400)

    body = request.get_json(silent=True)
    if not body or not body.get('image') or not body.get('name'):
        return failure_response('Missing required fields', 400)

    name = body['name'].strip().lower()
    category = (body.get('category') or '').strip().lower()
    image_data = body['image']

    if ',' in image_data:
        image_data = image_data.split(',', 1)[1]

    combined = f"{name}_{category}" if category else name
    key = f"{asset_type}/generated_images/{current_user_id}_{combined}.png"

    try:
        from io import BytesIO

        raw = base64.b64decode(image_data)
        buf = BytesIO(raw)

        success = storage.upload_image(buf, key, content_type='image/png')
        if success:
            return success_response({'key': key})
        return failure_response('Failed to upload icon', 500)
    except Exception:
        return failure_response('Error uploading icon', 500)


@app.route('/api/users/<int:user_id>/scan-image/', methods=['POST'])
@limiter.limit("20 per hour")
@token_required
@authorize_user
def scan_image(current_user_id, user_id):
    body = request.get_json(silent=True)
    if not body or not body.get('image'):
        return failure_response('Missing image data', 400)

    scan_type = body.get('scan_type', 'ingredients')  # 'ingredients' or 'allergies'
    image_data = body['image']

    # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
    if ',' in image_data:
        image_data = image_data.split(',', 1)[1]

    # Detect media type from original data URL or default to jpeg
    media_type = 'image/jpeg'
    if body['image'].startswith('data:'):
        prefix = body['image'].split(';')[0]
        media_type = prefix.split(':')[1]

    anthropic_key = app.config.get('ANTHROPIC_API_KEY')
    if not anthropic_key:
        return failure_response('Anthropic API key not configured', 500)

    try:
        claude_client = anthropic.Anthropic(api_key=anthropic_key)

        bbox_instruction = (
            " Also provide a bounding box for each item as a percentage of the image dimensions. "
            'The bbox field must be [x1_pct, y1_pct, x2_pct, y2_pct] where values are 0-100 '
            "(percentage from left/top edges). Example: [10, 20, 40, 60] means the item occupies "
            "from 10% to 40% horizontally and 20% to 60% vertically."
        )

        if scan_type == 'allergies':
            prompt = (
                "Look at this image carefully. Identify all food items visible. "
                "For each food item, determine if it is a common allergen or contains common allergens "
                "(such as peanuts, tree nuts, milk/dairy, eggs, wheat/gluten, soy, fish, shellfish, sesame). "
                "Return ONLY a JSON object with this exact format, no extra text:\n"
                '{"items": [{"name": "item name", "category": "allergen category or empty string", "bbox": [x1_pct, y1_pct, x2_pct, y2_pct]}]}\n'
                "Only include items that are allergens or contain allergens. "
                "Use simple lowercase names. Category should be one of: nuts, dairy, eggs, gluten, soy, seafood, or empty string."
                + bbox_instruction
            )
        else:
            prompt = (
                "Look at this image carefully. Identify all food items, ingredients, or produce visible. "
                "Return ONLY a JSON object with this exact format, no extra text:\n"
                '{"items": [{"name": "item name", "category": "food category or empty string", "bbox": [x1_pct, y1_pct, x2_pct, y2_pct]}]}\n'
                "Use simple lowercase names (e.g. 'apple', 'milk', 'chicken breast'). "
                "Category should be one of: vegetable, fruit, meat, dairy, grain, spice, condiment, frozen, or empty string."
                + bbox_instruction
            )

        response = claude_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": prompt}
                ],
            }]
        )

        text_content = next((b.text for b in response.content if b.type == "text"), "")

        # Parse the JSON response from Claude
        # Claude might wrap it in markdown code block
        if "```" in text_content:
            text_content = text_content.split("```")[1]
            if text_content.startswith("json"):
                text_content = text_content[4:]

        parsed = json.loads(text_content.strip())
        items = parsed.get("items", [])

        return success_response({"items": items, "scan_type": scan_type})

    except json.JSONDecodeError:
        return failure_response('Could not parse response from Claude', 500)
    except Exception:
        return failure_response('Error scanning image', 500)


@app.route('/api/users/<int:user_id>/saved-recipes/')
@token_required
@authorize_user
def get_recipes(current_user_id, user_id):
    if User.query.get(user_id) is None:
        return failure_response("User not found")
    
    recipes = Recipe.query.filter_by(user_id=user_id).all()

    return success_response([recipe.to_dict() for recipe in recipes])


@app.route('/api/users/<int:user_id>/saved-recipes/', methods=['POST'])
@token_required
@authorize_user
def save_recipe(current_user_id, user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    body = request.get_json(silent=True)
    
    if body is None or 'recipe' not in body:
        return failure_response('Missing recipe data in request body', 400)
    
    name = body.get('name', '')
    recipe_text = body.get('recipe')
    
    new_recipe = Recipe(
        recipe=recipe_text,
        name=name,
        user_id=user_id,
    )

    db.session.add(new_recipe)
    db.session.commit()

    return success_response(new_recipe.to_dict(), 201)


@app.route('/api/users/<int:user_id>/saved-recipes/<int:recipe_id>', methods=['PUT'])
@token_required
@authorize_user
def rename_recipe(current_user_id, user_id, recipe_id):
    user = User.query.get(user_id)
    if not user:
        return failure_response("User not found", 404)

    recipe = Recipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if recipe is None:
        return failure_response("Recipe not found", 404)

    body = request.get_json(silent=True)
    new_name = body.get('name', '')

    recipe.name = new_name
    db.session.commit()

    return success_response(recipe.to_dict())


@app.route('/api/users/<int:user_id>/saved-recipes/<int:recipe_id>', methods=['DELETE'])
@token_required
@authorize_user
def delete_recipe(current_user_id, user_id, recipe_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    recipe = Recipe.query.filter_by(id=recipe_id, user_id=user_id).first()

    if recipe is None:
        return failure_response("Recipe not found")
    
    db.session.delete(recipe)
    db.session.commit()

    return success_response(recipe.to_dict())
    

# Health Check Endpoint
@app.route('/health')
def health():
    try:
        # Test database connection
        db.session.execute(text("SELECT 1"))
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    except Exception:
        return jsonify({'status': 'unhealthy'}), 500
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)