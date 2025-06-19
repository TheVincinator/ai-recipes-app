import React, { useState, useEffect } from "react";

const SavedRecipes = ({ user }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const userId = user?.id;
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [recipeBeingRenamed, setRecipeBeingRenamed] = useState(null);

  useEffect(() => {
    async function fetchSavedRecipes() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}/saved-recipes/`);
        const result = await response.json();
        if (result.success) {
          setRecipes(result.data || []);
          setError(null);
        } else {
          setError(result.error || "Failed to load saved recipes.");
        }
      } catch {
        setError("Network error loading saved recipes.");
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchSavedRecipes();
  }, [userId]);

  const saveRecipeLocally = (text, name = "recipe") => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // DELETE recipe API call
  const deleteRecipe = async (recipeId) => {
    if (!window.confirm("Are you sure you want to delete this recipe?")) return;

    try {
      // Optimistic UI update: remove first
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));

      const response = await fetch(`/api/users/${userId}/saved-recipes/${recipeId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete recipe.");
      }
    } catch (err) {
      alert(`Error deleting recipe: ${err.message}`);
      // On error, refetch recipes to sync UI
      try {
        const resp = await fetch(`/api/users/${userId}/saved-recipes/`);
        const resJson = await resp.json();
        if (resJson.success) setRecipes(resJson.data || []);
      } catch {
        // ignore
      }
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-48 text-gray-600 animate-pulse">
        Loading saved recipes...
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 text-center mt-10 font-semibold animate-fadeIn">
        {error}
      </div>
    );
  if (!recipes.length)
    return (
      <div className="text-gray-500 text-center mt-10 italic animate-fadeIn">
        You have no saved recipes yet.
      </div>
    );

  return (
    <>
      <div
        className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fadeInUp"
        style={{ animationFillMode: "forwards" }}
      >
        {recipes.map((recipe) => {
          const preview =
            (typeof recipe === "string"
              ? recipe
              : recipe.recipe || "No preview available.") || "";
          const previewSnippet =
            preview.length > 120 ? preview.slice(0, 120) + "..." : preview;

          return (
            <article
              key={recipe.id || recipe.name}
              onClick={() => setSelectedRecipe(recipe)}
              tabIndex={0}
              role="button"
              aria-label={`View recipe: ${recipe.name || "Unnamed"}`}
              className="cursor-pointer bg-white rounded-lg shadow-md p-5 flex flex-col justify-between
                transform transition duration-300 ease-in-out
                hover:scale-[1.05] hover:shadow-2xl hover:shadow-blue-400/30 focus:outline-none focus:ring-4 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelectedRecipe(recipe);
              }}
            >
              <h3 className="font-semibold text-lg text-gray-800 mb-2 truncate">
                {recipe.name || "Unnamed Recipe"}
              </h3>
              <p className="text-gray-600 flex-grow whitespace-pre-wrap">
                {previewSnippet}
              </p>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveRecipeLocally(
                      typeof recipe === "string"
                        ? recipe
                        : recipe.recipe || "",
                      recipe.name || "recipe"
                    );
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1
                    transition-transform duration-200 ease-in-out
                    hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save Locally
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameInput(recipe.name || "");
                    setRecipeBeingRenamed(recipe);  // not setSelectedRecipe
                    setShowRenameModal(true);
                  }}                  
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded transition
                    transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  Rename
                </button>



                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteRecipe(recipe.id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm rounded px-3 py-1
                    transition-transform duration-200 ease-in-out
                    hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selectedRecipe && (
        <Modal onClose={() => setSelectedRecipe(null)}>
          <h2 className="text-3xl font-bold mb-4 text-gray-900 animate-fadeInUp">
            {selectedRecipe.name || "Recipe Preview"}
          </h2>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border border-gray-300 text-gray-800 animate-fadeIn">
            {typeof selectedRecipe === "string"
              ? selectedRecipe
              : selectedRecipe.recipe || "No recipe text available."}
          </pre>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() =>
                saveRecipeLocally(
                  typeof selectedRecipe === "string"
                    ? selectedRecipe
                    : selectedRecipe.recipe || "",
                  selectedRecipe.name || "recipe"
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded transition
                transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save to Local
            </button>
            <button
              onClick={() => setSelectedRecipe(null)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded transition
                transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {showRenameModal && recipeBeingRenamed && (
        <Modal onClose={() => {
          setShowRenameModal(false);
          setRecipeBeingRenamed(null);
        }}>
          <h2 className="text-xl font-bold mb-4">Rename Recipe</h2>
          <input
            type="text"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            placeholder="Enter new recipe name"
            className="border w-full p-2 rounded mb-4"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRenameModal(false);
                setRecipeBeingRenamed(null);
              }}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(
                    `/api/users/${userId}/saved-recipes/${recipeBeingRenamed.id}`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ name: renameInput.trim() }),
                    }
                  );
                  const result = await res.json();
                  if (res.ok && result.success) {
                    setRecipes((prev) =>
                      prev.map((r) =>
                        r.id === recipeBeingRenamed.id
                          ? { ...r, name: renameInput.trim() }
                          : r
                      )
                    );
                    setShowRenameModal(false);
                    setRecipeBeingRenamed(null);
                  } else {
                    alert("Failed to rename recipe.");
                  }
                } catch {
                  alert("Network error while renaming recipe.");
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Animate fade-in styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease forwards;
        }
      `}</style>
    </>
  );
};

const Modal = ({ children, onClose }) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    setShow(true);
    return () => setShow(false);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          show ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 p-6 transition-transform duration-300 ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-full overflow-auto p-8 relative">
          {children}
        </div>
      </div>
    </>
  );
};

export default SavedRecipes;
