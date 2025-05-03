# 🤖🍲 AI-Recipes

Based on your ingredients and preferences, you can use AI to generate recipes and cook delicious meals.

**AI Recipes** is an app that helps you keep a running list of everything in your kitchen. At any time, based on the ingredients you have and any allergies you specify, you can ask the AI to generate recipes tailored to your pantry. The app also provides images of dishes and ingredients to help you identify unfamiliar items. If you run out of something, simply remove it from your list.

### 🔧 Backend Features

* User authentication: create and sign in users
* Ingredient management: add, update, and remove ingredients
* Allergy tracking: log dietary restrictions
* AI-powered recipe generation via an external Hugging Face API
* Database design with three tables (`users`, `ingredients`, `allergies`), with one-to-many relationships

### 🖥️ Frontend Features

### 🖼️ Ingredient Icon Generator

The Ingredient Icon Generator is a feature of AI Recipes that creates 256×256 ingredient icons from user input, using either local assets or images fetched from the Pexels API. It uses YOLOv3 for object detection and `fuzzywuzzy` for typo-tolerant matching. If no relevant image is found, it gracefully falls back to generating labeled text icons.

> ⚠️ **Note:** You must provide your own [Pexels API key](https://www.pexels.com/api/) by updating the `PEXELS_API_KEY` variable in `main.py`.
