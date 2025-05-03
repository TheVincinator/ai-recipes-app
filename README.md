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

* Built on Kotlin with Jetpack Compose
* OkHttp client with coroutines for fetching
* Interactable chips with unique images and loading animations
* NavWrapper controls the program flow

### 🖼️ Ingredient Icon Generator

The Ingredient Icon Generator is a feature of AI Recipes that creates 256×256 ingredient icons from user input, using either local assets or images fetched from the Pexels API. It uses YOLOv3 for object detection and `fuzzywuzzy` for typo-tolerant matching. If no relevant image is found, it gracefully falls back to generating labeled text icons.

<img width="314" alt="Screenshot 2025-05-02 at 11 54 50 PM" src="https://github.com/user-attachments/assets/1649baf9-7d36-46c8-bb68-6a4a64da16eb" />
<img width="314" alt="Screenshot 2025-05-02 at 11 55 42 PM" src="https://github.com/user-attachments/assets/ecfb881d-9145-444a-b79d-5282efdab6d4" />

> ⚠️ **Note:** You must provide your own [Pexels API key](https://www.pexels.com/api/) by updating the `PEXELS_API_KEY` variable in `main.py`.
