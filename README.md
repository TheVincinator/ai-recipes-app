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

The Ingredient Icon Generator is a feature of AI Recipes that creates 256×256 ingredient icons from user input, using either local assets or images fetched from the Pixabay API. It uses YOLOv3 for object detection and `fuzzywuzzy` for typo-tolerant matching. If no relevant image is found, it gracefully falls back to generating labeled text icons.
> ⚠️ **Note:** You must provide your own [Pixabay API key](https://pixabay.com/service/about/api/) by updating the `PIXABAY_API_KEY` variable in `main.py`.

## 📸 Screenshots

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/1e19e03c-49d3-4b8b-8042-6ce3678ed130" alt="Login" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/010e13a9-7156-4ae6-bb78-6986de45ecda" alt="Create Account" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/309a3982-84c1-45df-87e4-cf9f17f54fec" alt="Manage Ingredients" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/bafe338f-19ce-4347-ae2a-ddefbfe7c575" alt="Manage Ingredients (continued)" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/0c49a96f-27af-4ba8-9435-b2f90f1f3d25" alt="Manage Allergies" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/af6315ea-43c5-42a1-8f8b-d47c997174c9" alt="Recipe Suggestions" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/bbbba7ba-7bbd-4d09-be57-bd15cd6ea925" alt="Save Recipe" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/7ca4d852-73d9-40f4-8eb6-f2ac42d559f4" alt="Saved Recipes" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/fc135252-c8b6-40d2-a409-9a97183502ba" alt="Account Settings" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
</table>
