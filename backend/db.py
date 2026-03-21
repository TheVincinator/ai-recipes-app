from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()

# Define models
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Define relationship - one user can have many ingredients
    ingredients = db.relationship('Ingredient', backref='owner', lazy=True, cascade="all, delete-orphan")
    allergies = db.relationship('Allergy', backref='owner', lazy=True, cascade="all, delete-orphan")
    recipes = db.relationship('Recipe', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'ingredients_count': len(self.ingredients)
        }


class Ingredient(db.Model):
    __tablename__ = 'ingredients'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Float)
    unit = db.Column(db.String(20))
    category = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'category': self.category or '',
            'user_id': self.user_id
        }


class Allergy(db.Model):
    __tablename__ = 'allergies'

    id = db.Column(db.Integer, primary_key=True)
    allergy_name = db.Column(db.String(100), nullable=False)
    allergy_category = db.Column(db.String(50), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'allergy_name': self.allergy_name,
            'allergy_category': self.allergy_category or '',
            "user_id": self.user_id
        }


class Recipe(db.Model):
    __tablename__ = 'recipes'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    recipe = db.Column(db.String(50000), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'recipe': self.recipe,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id
        }
