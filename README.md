# AI-Recipes

Based on your ingredients and preferences, you can use AI to generate recipes and cook delicious meals.

**AI Recipes** is an app that helps you keep a running list of everything in your kitchen. At any time, based on the ingredients you have and any allergies you specify, you can ask the AI to generate recipes tailored to your pantry. We also provide images of the dishes and ingredients in case you are unfamiliar with them. If you run out of a certain ingredient, feel free to remove it from your list.

The backend features we have implemented include routes for creating new users and signing in existing ones. Once signed in, users can add the ingredients they currently have, along with the quantities, as well as specify any allergies. Ingredients can be removed from the database as they are used. When a user is feeling hungry, they can call an external Hugging Face API that generates recipes based on their current ingredients and allergies.

Our database includes three tables: one for users, one for ingredients, and one for allergies. There is a one-to-many relationship between the users table and each of the other two. Additionally, we use YOLOv3 to fetch images from the web of recipes and ingredients upon user request. Please read about the Ingredient Icon Generator below to see how the YOLOv3 model is employed.

The Ingredient Icon Generator is a feature of our AI Recipe App that creates 256×256 ingredient icons from user input, using either local assets or images fetched online via the Pexels API. It uses YOLOv3 for object detection and `fuzzywuzzy` for typo-tolerant matching. If no relevant image is found, it gracefully falls back to labeled text icons. **Note:** You must provide your own Pexels API key by updating the `PEXELS_API_KEY` variable in `main.py`.
