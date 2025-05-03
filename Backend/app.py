from flask import Flask, request, jsonify
from db import db, User, Ingredient, Allergy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import requests
import json
from dotenv import load_dotenv
import os
from flask_cors import CORS


app = Flask(__name__)

CORS(app)

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

    db.session.delete(user)
    db.session.commit()
    return success_response(user.to_dict())


#accepts json format of an allergy that the user may have
@app.route('/api/allergies/<int:user_id>/', methods=['POST'])
def add_allergies(user_id):
    user = User.query.get(user_id)
    body = json.loads(request.data)

    if user is None:
        return json.dumps({"Error": "User not found"}), 404
    
    if ("allergies" in body and body["allergies"] and "category" in body and body["category"]):
        new_allergy = Allergy(
            food_allergy_name = body['allergies'],
            allergey_category = body['category'],
            user_id=user_id  
        )

        db.session.add(new_allergy)
        db.session.commit()

        return success_response(new_allergy.to_dict(), 201)
    else:
        return json.dumps({"Error": "No allergies given"}), 200


# Ingredient Routes
@app.route('/api/users/<int:user_id>/ingredients/', methods=['POST'])
def add_ingredient(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")

    body = json.loads(request.data)
    
    if not body or not body.get('name'):
        return failure_response('Ingredient name is required', 400)

    new_ingredient = Ingredient(
        name=body['name'],
        quantity=body.get('quantity', 0),
        unit=body.get('unit', 'units'),
        category=body.get('category'),
        user_id=user_id
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


@app.route('/api/ingredients/<int:ingredient_id>/')
def get_ingredient(ingredient_id):
    ingredient = Ingredient.query.get(ingredient_id)

    if ingredient is None:
        return failure_response("Ingredient not found")

    return success_response(ingredient.to_dict())


@app.route('/api/ingredients/<int:ingredient_id>/', methods=['PUT'])
def update_ingredient(ingredient_id):
    ingredient = Ingredient.query.get(ingredient_id)

    if ingredient is None:
        return failure_response("Ingredient not found")

    body = json.loads(request.data)
    
    if 'name' in body:
        ingredient.name = body['name']
    if 'quantity' in body:
        ingredient.quantity = body['quantity']
    if 'unit' in body:
        ingredient.unit = body['unit']
    if 'category' in body:
        ingredient.category = body['category']
  
    db.session.commit()
    return success_response(ingredient.to_dict())


@app.route('/api/ingredients/<int:ingredient_id>/', methods=['DELETE'])
def delete_ingredient(ingredient_id):
    ingredient = Ingredient.query.get(ingredient_id)

    if ingredient is None:
        return failure_response("Ingredient not found")

    db.session.delete(ingredient)
    db.session.commit()
    return success_response(ingredient.to_dict())


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


# Recipe suggestion route using AI
@app.route('/api/users/<int:user_id>/recipe-suggestions/')
def get_recipe_suggestions(user_id):
    user = User.query.get(user_id)

    if user is None:
        return failure_response("User not found")
    
    # Get all ingredients and allergies for the user
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    allergies = Allergy.query.filter_by(user_id=user_id).all()
    
    if not ingredients:
        return failure_response('No ingredients found for this user')
    
    # Format ingredients as a list of names
    ingredient_names = [ingredient.name for ingredient in ingredients]

    #get allergies
    allergy_names = []
    if allergies:
        allergy_names = [allergy.food_allergy_name for allergy in allergies]
    
    # Optional parameters
    meal_type = request.args.get('meal_type', '')  # breakfast, lunch, dinner
    cuisine = request.args.get('cuisine', '')      # italian, mexican, etc.
    diet = request.args.get('diet', '')            # vegetarian, vegan, etc.
    
    # Prepare the prompt for the AI
    prompt = f"Suggest recipes that can be made with these ingredients: {', '.join(ingredient_names)}."
    
    if meal_type:
        prompt += f" The meal type should be {meal_type}."
    if cuisine:
        prompt += f" The cuisine should be {cuisine}."
    if diet:
        prompt += f" The diet restriction is {diet}."

    if len(allergy_names) > 0:
        prompt += f"Please do not include these foods for allergy reasons {', '.join(allergy_names)}."
        
    try:
        # Call the AI API
        API_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions"
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

        response = requests.post(app.config['AI_API_URL'], headers=headers, json=payload)
        
        
        # Check if the request was successful
        if response.status_code == 200:
            api_response = response.json()
            recipes = api_response['choices'][0]['message']['content']
            return success_response({
                'ingredients_used': ingredient_names,
                'recipes': recipes,  # this is the full formatted string you saw
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
