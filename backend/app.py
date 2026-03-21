from flask import Flask, request, current_app, jsonify, send_from_directory
from db import db, User, Ingredient, Allergy, Recipe
import requests
import json
from dotenv import load_dotenv
import os
from flask_cors import CORS
from improved_icon_utils import (
    async_generate_icon, 
    cleanup_icon_if_unused
)
from cloud_storage_config import storage
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from sqlalchemy import text

ingredientOptions = ["beans", "beef", "butter", "cheese", "chicken", "eggs", "fish", "flour", "garlic", "herbs", "milk", "oil", "onions", "pepper", "pork", "rice", "salt", "sugar", "tomatoes", "vinegar", "water"]
allergyOptions = ["peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish"]

app = Flask(__name__)

app.url_map.strict_slashes = False

CORS(app, origins=[
    "https://ai-recipes-app-amber.vercel.app",
    "http://localhost:3000"
])

# Config
# Only load .env in development
if os.getenv('ENV') != 'production':
    load_dotenv()

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

app.config['AI_API_KEY'] = os.getenv('AI_API_KEY')
app.config['AI_API_URL'] = os.getenv('AI_API_URL')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')

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
def create_user():
    body = request.get_json(silent=True)
    
    if not body or not body.get('username') or not body.get('email') or not body.get('password'):
        return failure_response('Missing required fields', 400)
    
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

    # Ingredient icon cleanup
    for name, category in ingredient_data:
        if name not in ingredientOptions:
            cleanup_icon_if_unused(name, category, 'ingredient', Ingredient, 'name')

    # Allergy icon cleanup
    for name, category in allergy_data:
        if name not in allergyOptions:
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

    # Trigger async icon generation if custom
    if name not in allergyOptions:
        app_obj = current_app._get_current_object()
        async_generate_icon(app_obj, name, category, 'allergy')

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

    # Handle icon changes
    is_old_custom = old_name not in allergyOptions
    is_new_custom = new_name not in allergyOptions

    if new_name != old_name or new_category != old_category:
        # Clean up old icon if custom and no longer used
        if is_old_custom:
            cleanup_icon_if_unused(old_name, old_category, 'allergy', Allergy, 'allergy_name')
        
        # Generate new icon if custom
        if is_new_custom:
            app_obj = current_app._get_current_object()
            async_generate_icon(app_obj, new_name, new_category, 'allergy')

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

    # Clean up icon if no longer used
    if name not in allergyOptions:
        cleanup_icon_if_unused(name, category, 'allergy', Allergy, 'allergy_name')

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

    # Trigger async icon generation if custom
    if name not in ingredientOptions:
        app_obj = current_app._get_current_object()
        async_generate_icon(app_obj, name, category, 'ingredient')

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

    # Handle icon changes
    is_old_custom = old_name not in ingredientOptions
    is_new_custom = new_name not in ingredientOptions

    if new_name != old_name or new_category != old_category:
        # Clean up old icon if custom and no longer used
        if is_old_custom:
            cleanup_icon_if_unused(old_name, old_category, 'ingredient', Ingredient, 'name')
        
        # Generate new icon if custom
        if is_new_custom:
            app_obj = current_app._get_current_object()
            async_generate_icon(app_obj, new_name, new_category, 'ingredient')

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
    
    # Clean up icon if no longer used
    if ingredient_name not in ingredientOptions:
        cleanup_icon_if_unused(ingredient_name, ingredient_category, 'ingredient', Ingredient, 'name')
    
    return success_response(ingredient.to_dict())


# Asset Serving Routes
@app.route('/api/assets/ingredients/default_images/<string:name>')
def get_ingredient_default_image_by_name(name):
    filename = name.lower() + '.jpg'
    return send_from_directory('ingredient_icon_generator/assets/ingredients/default_images', filename)


@app.route('/api/assets/ingredients/generated_images/<string:combined>')
def get_ingredient_generated_image_by_name(combined):
    """Serve ingredient images (proxy from cloud or serve locally)"""
    if storage.use_cloud:
        key = f"ingredients/generated_images/{combined}.png"
        url = storage.get_url(key)
        r = requests.get(url)
        if r.status_code == 200:
            return r.content, 200, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600'}
        return '', 404
    else:
        # Serve locally (development)
        filename = f"{combined}.png"
        path = os.path.join('ingredient_icon_generator', 'assets', 
                           'ingredients', 'generated_images', filename)
        
        if os.path.exists(path):
            return send_from_directory(
                'ingredient_icon_generator/assets/ingredients/generated_images',
                filename
            )
        
        return send_from_directory(
            'ingredient_icon_generator/assets/ingredients/default_images',
            'placeholder.png'
        )


@app.route('/api/assets/allergies/default_images/<string:name>')
def get_allergy_default_image_by_name(name):
    filename = name.lower() + '.jpg'
    return send_from_directory('ingredient_icon_generator/assets/allergies/default_images', filename)


@app.route('/api/assets/allergies/generated_images/<string:combined>')
def get_allergy_generated_image_by_name(combined):
    """Serve allergy images (proxy from cloud or serve locally)"""
    if storage.use_cloud:
        key = f"allergies/generated_images/{combined}.png"
        url = storage.get_url(key)
        r = requests.get(url)
        if r.status_code == 200:
            return r.content, 200, {'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600'}
        return '', 404
    else:
        filename = f"{combined}.png"
        path = os.path.join('ingredient_icon_generator', 'assets', 
                           'allergies', 'generated_images', filename)
        
        if os.path.exists(path):
            return send_from_directory(
                'ingredient_icon_generator/assets/allergies/generated_images',
                filename
            )
        
        return send_from_directory(
            'ingredient_icon_generator/assets/allergies/default_images',
            'placeholder.png'
        )


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
    
    # Optional filters
    meal_type = request.args.get('meal_type', '')  # breakfast, lunch, dinner
    cuisine = request.args.get('cuisine', '')      # italian, mexican, etc.
    diet = request.args.get('diet', '')            # vegetarian, vegan, etc.
    
    # 🔹 Use helper function
    prompt = build_recipe_prompt(
        ingredients=ingredients,
        allergies=allergies,
        meal_type=meal_type,
        cuisine=cuisine,
        diet=diet
    )

    try:
        AI_API_URL = app.config.get('AI_API_URL', 'https://router.huggingface.co/novita/v3/openai/chat/completions')
        headers = {"Authorization": "Bearer " + app.config['AI_API_KEY']}
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "model": "deepseek/deepseek-v3-0324",
        }

        response = requests.post(AI_API_URL, headers=headers, json=payload)

        if response.status_code == 200:
            api_response = response.json()
            choices = api_response.get('choices')
            if not choices or not choices[0].get('message', {}).get('content'):
                return failure_response('Invalid response from AI API', 500)
            recipes = choices[0]['message']['content']
            return success_response({
                'ingredients_used': [i.name for i in ingredients],
                'recipes': recipes,
                'filters': {
                    'meal_type': meal_type,
                    'cuisine': cuisine,
                    'diet': diet
                }
            })
        else:
            return failure_response(f'Failed to get recipe suggestions: {response.text}', response.status_code)
            
    except Exception as e:
        return failure_response(f'Error calling AI API: {str(e)}', 500)
    

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

    # Allergies
    if allergies:
        allergy_descriptions = []
        for allergy in allergies:
            desc = allergy.allergy_name
            if allergy.allergy_category:
                desc += f" ({allergy.allergy_category})"
            allergy_descriptions.append(desc)
        prompt += f" Please avoid any recipes that include these allergens: {', '.join(allergy_descriptions)}."

    # Optional filters
    if meal_type:
        prompt += f" The meal type should be {meal_type}."
    if cuisine:
        prompt += f" The cuisine preference is {cuisine}."
    if diet:
        prompt += f" The recipes should follow a {diet} diet."

    prompt += " Please suggest a few recipes that fit these criteria, including ingredients and basic instructions."

    return prompt


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
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)