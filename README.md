# 🤖🍲 AI-Recipes

Based on your ingredients and preferences, you can use AI to generate recipes and cook delicious meals.

**AI Recipes** is an app that helps you keep a running list of everything in your kitchen. At any time, based on the ingredients you have and any allergies you specify, you can ask the AI to generate recipes tailored to your pantry. The app also provides images of dishes and ingredients to help you identify unfamiliar items. If you run out of something, simply remove it from your list.

### 🔧 Backend Features

* User authentication: create and sign in users
* Ingredient management: add, update, and remove ingredients
* Allergy tracking: log dietary restrictions
* AI-powered recipe generation via an external Hugging Face API
* Recipe management: save recipes to your account on the backend, with optional local device saving

### 🖥️ Frontend Features

* Built with React and styled using TailwindCSS
* Redesigned UI for a smoother and more intuitive user experience
* Search and filter ingredients to quickly find what you need
* Save recipes locally with the option to rename them within the app

### 🖼️ Ingredient Icon Generator

The Ingredient Icon Generator is a feature of AI Recipes that creates 256×256 ingredient icons from user input, using either local assets or images fetched from the Pexels API. It uses YOLOv3 for object detection and `fuzzywuzzy` for typo-tolerant matching. If no relevant image is found, it gracefully falls back to generating labeled text icons.
> ⚠️ **Note:** You must provide your own [Pexels API key](https://www.pexels.com/api/) by updating the `PEXELS_API_KEY` variable in `main.py`.

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/c11a7eb9-1b1f-404e-9589-8c620350b069" alt="Login" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/5b9331ce-d720-43bc-9de6-014d9889e086" alt="Create Account" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/9729ecd0-4986-4c86-94ff-1a7a42424215" alt="Manage Ingredients" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/18a5ff12-da31-44af-bdcd-d6cecb1c7626" alt="Allergies" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/a1fee036-76a2-433b-903e-2c8ba99dd1ff" alt="Recipe Suggestions" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/9c098480-cbb9-4d07-a70d-daef419fcd9b" alt="Saved Recipes" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/56b44987-4931-466c-833f-6dd37a0cc865" alt="Saved Recipes - Drilled in" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/a15e1e83-ab48-45b4-a6a2-00f29cac5716" alt="Saved Recipes - Rename Recipe" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/e9c5d407-d89c-43b1-8805-6a5e8b5d5958" alt="Account Settings" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
</table>

