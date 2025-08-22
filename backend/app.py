from flask import Flask, request, current_app
from db import db, User, Ingredient, Allergy, Recipe
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import json
from dotenv import load_dotenv
import os
from flask_cors import CORS
from flask import send_from_directory
from threading import Thread
from ingredient_icon_generator.ingredient_icon_utils import ingredient_async_generate_icon
from ingredient_icon_generator.allergy_icon_utils import allergy_async_generate_icon
from ingredient_icon_locks import INGREDIENT_ICON_LOCKS
from allergy_icon_locks import ALLERGY_ICON_LOCKS

ingredientOptions = ["beans", "beef", "butter", "cheese", "chicken", "eggs", "fish", "flour", "garlic", "herbs", "milk", "oil", "onions", "pepper", "pork", "rice", "salt", "sugar", "tomatoes", "vinegar", "water"]
allergyOptions = ["peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish"]

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://ai-recipes-app-amber.vercel.app",  # Vercel frontend
            "http://localhost:3000"                     # Local dev
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Config
load_dotenv() 

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['AI_API_KEY'] = os.getenv('AI_API_KEY')
app.config['AI_API_URL'] = os.getenv('AI_API_URL')

# Initialize the database
db.init_app(app)
with app.app_context():
    db.create_all()


def failure_response(message, code=404):
    return json.dumps({"error": message}), code


def success_response(data, code=200):
    return json.dumps({"success": True, "data": data}), code


@app.route("/ping")
def ping():
    return {"status": "ok"}


# User Routes
@app.route('/api/users/', methods=['POST'])
def create_user():
    body = json.loads(request.data)
    
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
    
    return success_response(new_user.to_dict(), 201)


@app.route('/api/users/<int:user_id>/')
def get_user(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    return success_response(user.to_dict())


@app.route('/api/users/<int:user_id>/', methods=['PUT'])
def update_user(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    body = json.loads(request.data)
    
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
def delete_user(user_id):
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
        lock_key = f"{name}_{category}" if category else name
        lock = INGREDIENT_ICON_LOCKS.get(lock_key)

        if lock:
            with lock:
                count = Ingredient.query.filter_by(name=name, category=category).count()
                if count == 0:
                    image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{name}_{category}.png" if category else f"./ingredient_icon_generator/assets/ingredients/generated_images/{name}.png"
                    if os.path.exists(image_path):
                        try:
                            os.remove(image_path)
                            print(f"[CLEANUP] Deleted unused ingredient icon: {image_path}", flush=True)
                        except Exception as e:
                            print(f"[ERROR] Could not delete ingredient image: {e}", flush=True)

    # Allergy icon cleanup
    for name, category in allergy_data:
        lock_key = f"{name}_{category}" if category else name
        lock = ALLERGY_ICON_LOCKS.get(lock_key)

        if lock:
            with lock:
                count = Allergy.query.filter_by(allergy_name=name, allergy_category=category).count()
                if count == 0:
                    image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{name}_{category}.png" if category else f"./ingredient_icon_generator/assets/allergies/generated_images/{name}.png"
                    if os.path.exists(image_path):
                        try:
                            os.remove(image_path)
                            print(f"[CLEANUP] Deleted unused allergy icon: {image_path}", flush=True)
                        except Exception as e:
                            print(f"[ERROR] Could not delete allergy image: {e}", flush=True)

    return success_response(user.to_dict())


#accepts json format of an allergy that the user may have
@app.route('/api/users/<int:user_id>/allergies/', methods=['POST'])
def add_allergy_for_user(user_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    body = json.loads(request.data)

    if not body or not body.get('allergy_name'):
        return failure_response('Allergy name is required', 400)
    
    name = body['allergy_name'].strip().lower()

    category = body.get('allergy_category', '').strip().lower()

    # === Image generation path ===
    if name not in allergyOptions:
        image_folder = 'ingredient_icon_generator/assets/allergies/generated_images'
        os.makedirs(image_folder, exist_ok=True)

        if category:
            image_filename = f"{name}_{category}.png"
            lock_key = f"{name}_{category}"
        else:
            image_filename = f"{name}.png"
            lock_key = name

        image_path = os.path.join(image_folder, image_filename)

        lock = ALLERGY_ICON_LOCKS[lock_key]
        with lock:
            if not os.path.exists(image_path):
                app_obj = current_app._get_current_object()
                Thread(target=allergy_async_generate_icon, args=(app_obj, name, category, image_path)).start()

    # Save image filename (not full path) into database
    new_allergy = Allergy(
        allergy_name=name,
        allergy_category=category,
        user_id=user_id
    )
    db.session.add(new_allergy)
    db.session.commit()

    return success_response(new_allergy.to_dict(), 201)
    

@app.route('/api/users/<int:user_id>/allergies/<int:allergy_id>/', methods=['PUT'])
def update_allergy_for_user(user_id, allergy_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    allergy = Allergy.query.filter_by(id=allergy_id, user_id=user_id).first()

    if allergy is None:
        return failure_response("Allergy not found")

    body = json.loads(request.data)

    old_name = allergy.allergy_name.lower()
    new_name = body.get('allergy_name', '').strip().lower()

    old_category = allergy.allergy_category.lower()
    new_category = body.get('allergy_category', '').strip().lower()

    if not new_name:
        return failure_response("Allergy name is required", 400)
    
    allergy.allergy_name = new_name
    allergy.allergy_category = new_category

    is_old_custom = old_name not in allergyOptions
    is_new_custom = new_name not in allergyOptions

    if new_name != old_name or new_category != old_category:
        # Delete old image if it was custom and no longer used
        if is_old_custom:
            if old_category:
                old_image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{old_name}_{old_category}.png"
                old_lock_key = f"{old_name}_{old_category}"
            else:
                old_image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{old_name}.png"
                old_lock_key = old_name

            lock = ALLERGY_ICON_LOCKS[old_lock_key]
            with lock:
                other_uses = Allergy.query.filter(
                    Allergy.allergy_name == old_name,
                    Allergy.allergy_category == old_category,
                    Allergy.id != allergy.id
                ).count()

                if other_uses == 0 and os.path.exists(old_image_path):
                    try:
                        os.remove(old_image_path)
                        current_app.logger.debug(f"Deleted old icon: {old_image_path}")
                    except FileNotFoundError:
                        current_app.logger.debug(f"Icon already deleted or missing: {old_image_path}")
                    except OSError as e:
                        current_app.logger.warning(f"Failed to delete icon '{old_image_path}': {e}")

        # Generate new image if it's custom
        if is_new_custom:
            if new_category:
                new_image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{new_name}_{new_category}.png"
            else:
                new_image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{new_name}.png"
            app_obj = current_app._get_current_object()
            Thread(target=allergy_async_generate_icon, args=(app_obj, new_name, new_category, new_image_path)).start()

    db.session.commit()
    return success_response(allergy.to_dict())


@app.route('/api/users/<int:user_id>/allergies/<int:allergy_id>/', methods=['DELETE'])
def delete_allergy_for_user(user_id, allergy_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")
    
    # Step 1: Find the ingredient
    allergy = Allergy.query.filter_by(id=allergy_id, user_id=user_id).first()
    if allergy is None:
        return failure_response("Allergy not found")
    
    name = allergy.allergy_name.lower()

    category = allergy.allergy_category.lower()

    # Delete the ingredient
    db.session.delete(allergy)
    db.session.commit()

    # Step 2: Check if any other users have this ingredient
    lock_key = f"{name}_{category}" if category else name
    lock = ALLERGY_ICON_LOCKS[lock_key]

    with lock:
        other_uses = Allergy.query.filter_by(
            allergy_name=name,
            allergy_category=category
        ).count()

        if other_uses == 0:
            # Step 3: Delete the image file
            if category:
                image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{name}_{category}.png"
            else:
                image_path = f"./ingredient_icon_generator/assets/allergies/generated_images/{name}.png"
                
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    print(f"[CLEANUP] Deleted unused icon: {image_path}", flush=True)
                except FileNotFoundError:
                    print(f"[INFO] Icon already deleted by another thread: {image_path}", flush=True)
                except Exception as e:
                    print(f"[ERROR] Could not delete image: {e}", flush=True)

    return success_response(allergy.to_dict())


@app.route('/api/users/<int:user_id>/allergies/')
def get_allergies_for_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return success_response('User not found')

    allergies = Allergy.query.filter_by(user_id=user_id).all()
    return success_response([allergy.to_dict() for allergy in allergies])


# Ingredient Routes
@app.route('/api/users/<int:user_id>/ingredients/', methods=['POST'])
def add_ingredient(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    body = json.loads(request.data)
    
    if not body or not body.get('name'):
        return failure_response('Ingredient name is required', 400)

    name = body['name'].strip().lower()

    category = body.get('category', '').strip().lower()

    # === Image generation path ===
    if name not in ingredientOptions:
        image_folder = 'ingredient_icon_generator/assets/ingredients/generated_images'
        os.makedirs(image_folder, exist_ok=True)

        if category:
            image_filename = f"{name}_{category}.png"
            lock_key = f"{name}_{category}"
        else:
            image_filename = f"{name}.png"
            lock_key = name

        image_path = os.path.join(image_folder, image_filename)

        lock = INGREDIENT_ICON_LOCKS[lock_key]
        with lock:
            if not os.path.exists(image_path):
                app_obj = current_app._get_current_object()
                Thread(target=ingredient_async_generate_icon, args=(app_obj, name, category, image_path)).start()

    # Save image filename (not full path) into database
    new_ingredient = Ingredient(
        name=name,
        quantity=body.get('quantity', 0),
        unit=body.get('unit', 'units'),
        category=body.get('category'),
        user_id=user_id,
    )

    db.session.add(new_ingredient)
    db.session.commit()

    return success_response(new_ingredient.to_dict(), 201)


@app.route('/api/users/<int:user_id>/ingredients/')
def get_user_ingredients(user_id):
    if User.query.get(user_id) is None:    # Check if user exists
        return failure_response("User not found")
    
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    return success_response([ingredient.to_dict() for ingredient in ingredients])


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/')
def get_ingredient(user_id, ingredient_id):
    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()

    if ingredient is None:
        return failure_response("Ingredient not found or does not belong to user")
    
    return success_response(ingredient.to_dict())


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/', methods=['PUT'])
def update_ingredient(user_id, ingredient_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")

    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()
    if ingredient is None:
        return failure_response("Ingredient not found")

    body = json.loads(request.data)

    old_name = ingredient.name.lower()
    new_name = body.get('name', '').strip().lower()

    old_category = ingredient.category.lower()
    new_category = body.get('category', '').strip().lower()

    if not new_name:
        return failure_response("Ingredient name is required", 400)

    # Update fields
    ingredient.name = new_name
    ingredient.category = new_category
    ingredient.quantity = body.get('quantity', ingredient.quantity)
    ingredient.unit = body.get('unit', ingredient.unit)

    is_old_custom = old_name not in ingredientOptions
    is_new_custom = new_name not in ingredientOptions

    if new_name != old_name or new_category != old_category:
        # Delete old image if it was custom and no longer used
        if is_old_custom:
            if old_category:
                old_image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{old_name}_{old_category}.png"
                old_lock_key = f"{old_name}_{old_category}"
            else:
                old_image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{old_name}.png"
                old_lock_key = old_name

            lock = INGREDIENT_ICON_LOCKS[old_lock_key]
            with lock:
                other_uses = Ingredient.query.filter(
                    Ingredient.name == old_name,
                    Ingredient.category == old_category,
                    Ingredient.id != ingredient.id
                ).count()

                if other_uses == 0 and os.path.exists(old_image_path):
                    try:
                        os.remove(old_image_path)
                        current_app.logger.debug(f"Deleted old icon: {old_image_path}")
                    except FileNotFoundError:
                        current_app.logger.debug(f"Icon already deleted or missing: {old_image_path}")
                    except OSError as e:
                        current_app.logger.warning(f"Failed to delete icon '{old_image_path}': {e}")

        # Generate new image if it's custom
        if is_new_custom:
            if new_category:
                new_image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{new_name}_{new_category}.png"
            else:
                new_image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{new_name}.png"
            app_obj = current_app._get_current_object()
            Thread(target=ingredient_async_generate_icon, args=(app_obj, new_name, new_category, new_image_path)).start()

    db.session.commit()
    return success_response(ingredient.to_dict(), 200)


@app.route('/api/users/<int:user_id>/ingredients/<int:ingredient_id>/', methods=['DELETE'])
def delete_ingredient(user_id, ingredient_id):
    user = User.query.get(user_id)
    if user is None:
        return failure_response("User not found")
    
    # Step 1: Find the ingredient
    ingredient = Ingredient.query.filter_by(id=ingredient_id, user_id=user_id).first()
    if not ingredient:
        return failure_response("Ingredient not found")

    ingredient_name = ingredient.name.lower()

    ingredient_category = ingredient.category.lower()
    
    # Delete the ingredient
    db.session.delete(ingredient)
    db.session.commit()
    
    # Step 2: Check if any other users have this ingredient
    lock_key = f"{ingredient_name}_{ingredient_category}" if ingredient_category else ingredient_name
    lock = INGREDIENT_ICON_LOCKS[lock_key]

    with lock:
        other_uses = Ingredient.query.filter_by(
            name=ingredient_name,
            category=ingredient_category
        ).count()

        if other_uses == 0:
            # Step 3: Delete the image file
            if ingredient_category:
                image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{ingredient_name}_{ingredient_category}.png"
            else:
                image_path = f"./ingredient_icon_generator/assets/ingredients/generated_images/{ingredient_name}.png"
                
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    print(f"[CLEANUP] Deleted unused icon: {image_path}", flush=True)
                except FileNotFoundError:
                    print(f"[INFO] Icon already deleted by another thread: {image_path}", flush=True)
                except Exception as e:
                    print(f"[ERROR] Could not delete image: {e}", flush=True)
    
    return success_response(ingredient.to_dict())


@app.route('/api/assets/ingredients/default_images/<string:name>')
def get_ingredient_default_image_by_name(name):
    filename = name.lower() + '.jpg'
    return send_from_directory('ingredient_icon_generator/assets/ingredients/default_images', filename)


@app.route('/api/assets/ingredients/generated_images/<string:combined>')
def get_ingredient_generated_image_by_name(combined):
    filename = f"{combined}.png"
    path = os.path.join('ingredient_icon_generator', 'assets', 'ingredients', 'generated_images', filename)

    if os.path.exists(path):
        return send_from_directory(
            'ingredient_icon_generator/assets/ingredients/generated_images',
            filename
        )

    # Fallback to placeholder
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
    filename = f"{combined}.png"
    path = os.path.join('ingredient_icon_generator', 'assets', 'allergies', 'generated_images', filename)

    if os.path.exists(path):
        return send_from_directory(
            'ingredient_icon_generator/assets/allergies/generated_images',
            filename
        )

    # Fallback to placeholder
    return send_from_directory(
        'ingredient_icon_generator/assets/allergies/default_images',
        'placeholder.png'
    )


# Search Route
@app.route('/api/users/<int:user_id>/ingredients/search/')
def search_ingredients(user_id):
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
    body = json.loads(request.data)
    
    if not body or not body.get('username') or not body.get('password'):
        return failure_response('Missing username or password', 400)
    
    user = User.query.filter_by(username=body['username']).first()
    
    if not user or not user.check_password(body['password']):
        return failure_response('Invalid username or password', 401)
    
    # In a real application, you'd generate a JWT token or session here
    return success_response({'message': 'Login successful', 'user': user.to_dict()})


@app.route('/api/auth/logout/', methods=['POST'])
def logout():
    # If using sessions, you'd clear the session here.
    # For JWT, you might blacklist the token or just rely on token expiry.
    return success_response('Logged out successfully')


# Recipe suggestion route using AI
@app.route('/api/users/<int:user_id>/recipe-suggestions/')
def get_recipe_suggestions(user_id):
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
            recipes = api_response['choices'][0]['message']['content']
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

    print(prompt)
    return prompt


@app.route('/api/users/<int:user_id>/saved-recipes/')
def get_recipes(user_id):
    if User.query.get(user_id) is None:
        return failure_response("User not found")
    
    recipes = Recipe.query.filter_by(user_id=user_id).all()

    return success_response([recipe.to_dict() for recipe in recipes])


@app.route('/api/users/<int:user_id>/saved-recipes/', methods=['POST'])
def save_recipe(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    body = json.loads(request.data)
    
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
def rename_recipe(user_id, recipe_id):
    user = User.query.get(user_id)
    if not user:
        return failure_response("User not found", 404)

    recipe = Recipe.query.filter_by(id=recipe_id, user_id=user_id).first()
    if recipe is None:
        return failure_response("Recipe not found", 404)

    body = json.loads(request.data)
    new_name = body.get('name', '')

    recipe.name = new_name
    db.session.commit()

    return success_response(recipe.to_dict())


@app.route('/api/users/<int:user_id>/saved-recipes/<int:recipe_id>/', methods=['DELETE'])
def delete_recipe(user_id, recipe_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    recipe = Recipe.query.filter_by(id=recipe_id, user_id=user_id).first()

    if recipe is None:
        return failure_response("Recipe not found")
    
    db.session.delete(recipe)
    db.session.commit()

    return success_response(recipe.to_dict())
    


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)