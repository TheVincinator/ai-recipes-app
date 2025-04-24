from flask import Flask, request, jsonify
from db import db, User, Ingredient
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import requests
import json
from dotenv import load_dotenv
import os

app = Flask(__name__)

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


# User Routes
@app.route('/api/users/', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    new_user = User(
        username=data['username'],
        email=data['email']
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(new_user.to_dict()), 201

@app.route('/api/users/<int:user_id>/', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@app.route('/api/users/<int:user_id>/', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if 'username' in data:
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'error': 'Username already exists'}), 409
        user.username = data['username']
        
    if 'email' in data:
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'error': 'Email already exists'}), 409
        user.email = data['email']
        
    if 'password' in data:
        user.set_password(data['password'])
    
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users/<int:user_id>/', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'User {user_id} deleted successfully'}), 200

# Ingredient Routes
@app.route('/api/users/<int:user_id>/ingredients/', methods=['POST'])
def add_ingredient(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Ingredient name is required'}), 400

    new_ingredient = Ingredient(
        name=data['name'],
        quantity=data.get('quantity', 0),
        unit=data.get('unit', 'units'),
        category=data.get('category'),
        user_id=user_id
    )
    
    db.session.add(new_ingredient)
    db.session.commit()
    
    return jsonify(new_ingredient.to_dict()), 201

@app.route('/api/users/<int:user_id>/ingredients/', methods=['GET'])
def get_user_ingredients(user_id):
    User.query.get_or_404(user_id)  # Check if user exists
    
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    return jsonify([ingredient.to_dict() for ingredient in ingredients])

@app.route('/api/ingredients/<int:ingredient_id>/', methods=['GET'])
def get_ingredient(ingredient_id):
    ingredient = Ingredient.query.get_or_404(ingredient_id)
    return jsonify(ingredient.to_dict())

@app.route('/api/ingredients/<int:ingredient_id>/', methods=['PUT'])
def update_ingredient(ingredient_id):
    ingredient = Ingredient.query.get_or_404(ingredient_id)
    data = request.get_json()
    
    if 'name' in data:
        ingredient.name = data['name']
    if 'quantity' in data:
        ingredient.quantity = data['quantity']
    if 'unit' in data:
        ingredient.unit = data['unit']
    if 'category' in data:
        ingredient.category = data['category']
  
    db.session.commit()
    return jsonify(ingredient.to_dict())

@app.route('/api/ingredients/<int:ingredient_id>/', methods=['DELETE'])
def delete_ingredient(ingredient_id):
    ingredient = Ingredient.query.get_or_404(ingredient_id)
    db.session.delete(ingredient)
    db.session.commit()
    return jsonify({'message': f'Ingredient {ingredient_id} deleted successfully'}), 200

# Search Route
@app.route('/api/users/<int:user_id>/ingredients/search/', methods=['GET'])
def search_ingredients(user_id):
    User.query.get_or_404(user_id)  # Check if user exists
    
    query = request.args.get('q', '')
    category = request.args.get('category')
    
    ingredients_query = Ingredient.query.filter_by(user_id=user_id)
    
    if query:
        ingredients_query = ingredients_query.filter(Ingredient.name.like(f'%{query}%'))
    
    if category:
        ingredients_query = ingredients_query.filter_by(category=category)
    
    ingredients = ingredients_query.all()
    return jsonify([ingredient.to_dict() for ingredient in ingredients])

# Authentication Route
@app.route('/api/auth/login/', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # In a real application, you'd generate a JWT token or session here
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict()
    })

# Recipe suggestion route using AI
@app.route('/api/users/<int:user_id>/recipe-suggestions/', methods=['GET'])
def get_recipe_suggestions(user_id):
    user = User.query.get_or_404(user_id)
    
    # Get all ingredients for the user
    ingredients = Ingredient.query.filter_by(user_id=user_id).all()
    
    if not ingredients:
        return jsonify({'error': 'No ingredients found for this user'}), 404
    
    # Format ingredients as a list of names
    ingredient_names = [ingredient.name for ingredient in ingredients]
    
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
            return jsonify({
                'ingredients_used': ingredient_names,
                'recipes': recipes,  # this is the full formatted string you saw
                'filters': {
                    'meal_type': meal_type,
                    'cuisine': cuisine,
                    'diet': diet
                }
            })
        else:
            return jsonify({
                'error': 'Failed to get recipe suggestions',
                'status_code': response.status_code,
                'response': response.text
            }), 500
            
    except Exception as e:
        return jsonify({'error': f'Error calling AI API: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
