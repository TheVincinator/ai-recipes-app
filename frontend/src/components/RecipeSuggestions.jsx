import React, { useState, useRef } from "react";

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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/recipe-suggestions/?${params.toString()}`
      );
      const result = await response.json();

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
    <div className="mt-8 border-t pt-6">
      <h2 className="text-xl font-bold mb-2">Get Recipe Suggestions</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Meal Type Input */}
        <div>
          <input
            list="mealTypes"
            placeholder="Meal Type (e.g. dinner)"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <datalist id="mealTypes">
            {mealTypeOptions.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>

        {/* Cuisine Input */}
        <div>
          <input
            list="cuisines"
            placeholder="Cuisine (e.g. Italian)"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <datalist id="cuisines">
            {cuisineOptions.map((cuisine) => (
              <option key={cuisine} value={cuisine} />
            ))}
          </datalist>
        </div>

        {/* Diet Input */}
        <div>
          <input
            list="diets"
            placeholder="Diet (e.g. vegetarian)"
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            className="border p-2 rounded w-full"
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
        className={`${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
        } text-white font-semibold px-4 py-2 rounded`}
      >
        {loading ? "Loading..." : "Get Suggestions"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 border border-red-300 bg-red-100 p-2 rounded">
          ⚠️ {error}
        </p>
      )}

      {recipes && (
        <div
          ref={recipeRef}  // 👈 Add this line
          className="mt-6 bg-gray-100 p-4 rounded shadow whitespace-pre-wrap"
        >
          <h3 className="font-semibold mb-2">Suggested Recipes:</h3>
          <p>{recipes}</p>
          <button
            onClick={() => {
              setRecipeToSave(recipes);
              setShowNameModal(true);
            }}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Save This Recipe
          </button>
        </div>
      )}

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md transform transition-all duration-300 scale-100">
            <h2 className="text-xl font-semibold mb-4">Name Your Recipe</h2>
            <input
              type="text"
              placeholder="Enter recipe name (optional)"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setRecipeName("");
                  setRecipeToSave(null);
                }}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/${userId}/saved-recipes/`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: recipeName.trim() || '',
                        recipe: recipeToSave,
                      }),
                    });

                    const result = await response.json();

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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {messageModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`bg-white p-6 rounded-lg shadow-lg w-full max-w-sm transform transition-all duration-300 scale-100 border-l-4 ${
            messageModal.success ? "border-green-500" : "border-red-500"
          }`}>
            <h2 className="text-lg font-semibold mb-2">
              {messageModal.success ? "Success" : "Error"}
            </h2>
            <p className="mb-4">{messageModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setMessageModal({ show: false, message: "", success: true })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecipeSuggestions;
