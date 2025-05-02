# AI-Recipes

Based on your ingredients and preferences, you can generate recipes with AI to cook some delicious foods.

AI Recipes is an app that allows you to keep a running list of everything in your kitchen. At any time, based on the ingredients you have and any potential allergies, you can ask AI for recipes based on what you already have. We also make sure to provide some images of the foods and ingredients needed in case you are unfamiliar with them. If you no longer have a certain ingredient, feel free to take it remove it from your list. 

The features we have implemented in the backend include routes to create new users and for existing users to sign in. When signed in, each user can add ingredients they currently carry and the amount they have, as well as any allergies to be aware of. If they have used some ingredients, they may delete them from the database. If a user is feeling hungry, they can call an external Hugging Face api that generates recipes based on their ingredients and allergies. For our database, we created 3 tables, one for users, ingredients, and allergies, with a one-to-many relationship between the users table and the other two. Additionally, we used YoloV8 to generate images from the web of the recipes and ingredients upon a user's request.
