import React, { useState, useRef } from "react";
import api from '../axios';

const mealTypeOptions = ["breakfast", "lunch", "dinner", "snack"];
const cuisineOptions = ["American", "Italian", "Mexican", "Chinese", "Indian", "French", "Japanese"];
const dietOptions = ["vegetarian", "vegan", "gluten-free", "keto", "pescatarian"];

const RecipeSuggestions = ({ userId }) => {
  const [recipes, setRecipes] = useState("");
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState("");
  const [error, setError] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [recipeToSave, setRecipeToSave] = useState(null);
  const [recipeName, setRecipeName] = useState("");
  const [messageModal, setMessageModal] = useState({ show: false, message: "", success: true });
  const recipeRef = useRef(null);

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (mealType) params.append("meal_type", mealType);
    if (cuisine) params.append("cuisine", cuisine);
    if (diet) params.append("diet", diet);

    try {
      const response = await api.get(`/api/users/${userId}/recipe-suggestions/?${params.toString()}`);
      const result = response.data;

      if (result.success) {
        setRecipes(result.data.recipes || "");

        // Wait for the recipe to be rendered before scrolling
        setTimeout(() => {
          if (recipeRef.current) {
            recipeRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100); // small delay to ensure render
      } else {
        setError(result.error || "Failed to get recipes.");
        setRecipes("");
      }
    } catch (err) {
      setError("Network error while fetching recipe suggestions.");
      setRecipes("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🍳 Recipe Suggestions</h2>
            <p className="text-gray-600">Get personalized recipes based on your ingredients</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Meal Type Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <input
                list="mealTypes"
                placeholder="e.g. dinner"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
              />
              <datalist id="mealTypes">
                {mealTypeOptions.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>

            {/* Cuisine Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
              <input
                list="cuisines"
                placeholder="e.g. Italian"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
              />
              <datalist id="cuisines">
                {cuisineOptions.map((cuisine) => (
                  <option key={cuisine} value={cuisine} />
                ))}
              </datalist>
            </div>

            {/* Diet Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diet</label>
              <input
                list="diets"
                placeholder="e.g. vegetarian"
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
              />
              <datalist id="diets">
                {dietOptions.map((diet) => (
                  <option key={diet} value={diet} />
                ))}
              </datalist>
            </div>
          </div>

          <button
            onClick={fetchRecipes}
            disabled={loading}
            className={`w-full font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 mb-6 ${
              loading 
                ? "bg-gray-400 text-gray-200 cursor-not-allowed transform-none" 
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-purple-500"
            }`}
          >
            {loading ? "Loading..." : "🔍 Get Recipe Suggestions"}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">⚠️ {error}</p>
            </div>
          )}

          {recipes && (
            <div
              ref={recipeRef}
              className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🍽️ Suggested Recipes:</h3>
              <div className="text-gray-700 mb-4">{recipes}</div>
              <button
                onClick={() => {
                  setRecipeToSave(recipes);
                  setShowNameModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                💾 Save This Recipe
              </button>
            </div>
          )}
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Name Your Recipe</h2>
            <input
              type="text"
              placeholder="Enter recipe name (optional)"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 mb-6"
            />
            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    const response = await api.post(`/api/users/${userId}/saved-recipes/`, {
                      name: recipeName.trim() || '',
                      recipe: recipeToSave,
                    });

                    const result = response.data;

                    if (!response.ok || !result.success) {
                      setMessageModal({ show: true, message: "❌ Failed to save recipe.", success: false });
                    } else {
                      setMessageModal({ show: true, message: "✅ Recipe saved successfully!", success: true });
                    }                    
                  } catch (err) {
                    setMessageModal({ show: true, message: "❌ Error saving recipe.", success: false });;
                    console.error(err);
                  } finally {
                    setShowNameModal(false);
                    setRecipeName("");
                    setRecipeToSave(null);
                  }
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                💾 Save Recipe
              </button>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setRecipeName("");
                  setRecipeToSave(null);
                }}
                className="w-full bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-800 font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {messageModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`bg-white p-8 rounded-xl shadow-lg w-full max-w-sm transform transition-all duration-300 scale-100 border-l-4 ${
            messageModal.success ? "border-green-500" : "border-red-500"
          }`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {messageModal.success ? "✅ Success" : "❌ Error"}
            </h2>
            <p className="text-gray-600 mb-6">{messageModal.message}</p>
            <button
              onClick={() => setMessageModal({ show: false, message: "", success: true })}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecipeSuggestions;
