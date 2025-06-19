import axios from 'axios';
import React, { useState, useEffect } from 'react';
import AllergyManager from './AllergyManager';
import EditIngredientModal from './EditIngredientModal';
import RecipeSuggestions from './RecipeSuggestions';
import CreatableSelect from 'react-select/creatable';

const unitOptions = ["g", "kg", "ml", "l", "cup", "tbsp", "tsp", "oz", "lb"];
const ingredientOptions = ["beans", "beef", "butter", "cheese", "chicken", "eggs", "fish", "flour", "garlic", "herbs", "milk", "oil", "onions", "pepper", "pork", "rice", "salt", "sugar", "tomatoes", "vinegar", "water"];
const categoryOptions = ["vegetable", "fruit", "meat", "dairy", "grain", "spice", "condiment", "frozen"];

function IngredientImage({ name, category }) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  const generateImageUrl = () => {
    const formattedName = category
      ? `${name.toLowerCase()}_${category.toLowerCase()}`
      : name.toLowerCase();
    return `/api/assets/ingredients/generated_images/${formattedName}?&t=${Date.now()}`;
  };
  

  useEffect(() => {
  let interval;

  // Reset loading and attempts when name or category changes
  setLoading(true);
  setAttempts(0);

  const checkImage = () => {
    const img = new Image();
    const newSrc = generateImageUrl();

    img.onload = () => {
      if (!img.src.includes('placeholder')) {
        setSrc(newSrc);
        setLoading(false);
        clearInterval(interval);
      } else {
        retry();
      }
    };

    img.onerror = () => {
      retry();
    };

    img.src = newSrc;
  };

  const retry = () => {
    setAttempts(prev => {
      const next = prev + 1;
      if (next >= maxAttempts) {
        setLoading(false);
        clearInterval(interval);
      }
      return next;
    });
  };

  checkImage();
  interval = setInterval(checkImage, 1000);

  return () => clearInterval(interval);
}, [name, category]);


  if (loading) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="flex space-x-1">
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-8 h-8 rounded-full object-cover border border-gray-300"
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/api/assets/ingredients/default_images/placeholder';
      }}
    />
  );
}



export default function IngredientManager({ user }) {
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', category: '' });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [categoryFilterDebounced, setCategoryFilterDebounced] = useState('');
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Debounce category filter input
  useEffect(() => {
    const handler = setTimeout(() => {
      setCategoryFilterDebounced(categoryFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [categoryFilter]);

  useEffect(() => {
    fetchIngredients();
  }, [searchDebounced, categoryFilterDebounced]);

  useEffect(() => {
    // If name is cleared, also clear quantity, unit, and category
    if (form.name === '') {
      setForm((prev) => ({
        ...prev,
        quantity: '',
        unit: '',
        category: '',
      }));
    }
  }, [form.name]);
  
  useEffect(() => {
    // If quantity is cleared or invalid, also clear unit
    if (form.quantity === '' || isNaN(Number(form.quantity))) {
      setForm((prev) => ({
        ...prev,
        unit: '',
      }));
    }
  }, [form.quantity]);  

  const fetchIngredients = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchDebounced) queryParams.append('q', searchDebounced);
      if (categoryFilterDebounced) queryParams.append('category', categoryFilterDebounced);

      const res = await axios.get(`/api/users/${user.id}/ingredients/search/?${queryParams}`);
      setIngredients(res.data.data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isValid = () => {
    const finalName = form.name.trim();
    return (
      finalName !== ''
    );
  };

  const addIngredient = () => {
    const finalUnit = form.unit;
    const finalCategory = form.category;
    const finalName = form.name;

    const exists = ingredients.some(i =>
      i.name.toLowerCase() === finalName.toLowerCase() &&
      (i.category?.toLowerCase() || '') === (finalCategory?.toLowerCase() || '')
    );

    if (exists) {
      alert("This ingredient already exists.");
      return;
    }

    const ingredientData = {
      ...form,
      name: finalName,
      unit: finalUnit,
      category: finalCategory,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
    };

    fetch(`/api/users/${user.id}/ingredients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingredientData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIngredients((prev) => [...prev, data.data]);
          setForm({ name: '', quantity: '', unit: '', category: '' });
        } else {
          alert("Failed to add ingredient: " + (data.message || "Unknown error"));
        }
      })
      .catch((error) => {
        console.error('Add ingredient failed:', error);
        alert("Failed to add ingredient.");
      });
  };

  const openEditModal = (ingredient) => {
    setEditingIngredient(ingredient);
    setIsModalOpen(true);
  };
  
  const handleUpdate = async (updatedIngredient) => {
    try {
      const res = await fetch(`/api/users/${user.id}/ingredients/${updatedIngredient.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedIngredient),
      });
  
      const data = await res.json();
      if (data.success) {
        setIngredients((prev) =>
          prev.map((ing) => (ing.id === updatedIngredient.id ? updatedIngredient : ing))
        );
      }
    } catch (error) {
      console.error("Error updating ingredient:", error);
    }
  };

  const removeIngredient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ingredient?")) return;
    try {
      await axios.delete(`/api/users/${user.id}/ingredients/${id}/`);
      setIngredients((prev) => prev.filter(ing => ing.id !== id));
    } catch (error) {
      console.error('Error deleting ingredient:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addIngredient();
  };

  const categorySelectOptions = categoryOptions.map((cat) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }));

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🧾 Manage Ingredients</h2>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4">
        <label htmlFor="search" className="sr-only">Search ingredients</label>
        <input
          id="search"
          type="text"
          className="flex-grow border rounded p-2"
          placeholder="🔍 Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="categoryFilter" className="sr-only">Category filter</label>
        <CreatableSelect
          className="w-1/3 text-sm"
          placeholder="Filter by category..."
          isClearable
          value={
            categoryFilter
              ? { value: categoryFilter, label: categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1) }
              : null
          }
          onChange={(selectedOption) =>
            setCategoryFilter(selectedOption ? selectedOption.value : '')
          }
          options={categorySelectOptions}
        />
      </div>

      {/* Add Ingredient Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 mb-4">
        <label htmlFor="name" className="sr-only">Ingredient name</label>
        <div>
          <input
            list="name"
            placeholder="Ingredient name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <datalist id="name">
            {ingredientOptions.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        <label htmlFor="quantity" className="sr-only">Quantity</label>
        <input
          id="quantity"
          className={`border rounded p-2 ${
            form.name === ''
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : ''
          }`}
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Quantity (optional)"
          type="number"
          step="any"
          min="0"
          disabled={
            form.name === ''
          }
        />

        <label htmlFor="unit" className="sr-only">Unit</label>
        <div>
          <input
            list="unit"
            placeholder="Unit (optional)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={`border p-2 rounded w-full ${form.quantity === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            disabled={form.quantity === '' || isNaN(Number(form.quantity))}
          />
          <datalist id="unit">
            {unitOptions.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>


        <label htmlFor="category" className="sr-only">Category</label>
        <div>
          <input
            list="category"
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={`border p-2 rounded w-full ${form.name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            disabled={form.name === ''}
          />
          <datalist id="category">
            {categoryOptions.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>


        <button
          type="submit"
          disabled={!isValid()}
          className={`col-span-2 p-2 rounded text-white transition
            ${isValid() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          ➕ Add Ingredient
        </button>
      </form>

      {/* Ingredient List */}
      <ul className="divide-y">
        {ingredients.map((ingredient) => (
          <li key={ingredient.id} className="py-2 flex justify-between items-center">
            <div className="flex items-center gap-3">
            {ingredientOptions.map(name => name.toLowerCase()).includes(ingredient.name.toLowerCase()) ? (
              <img
                src={`/api/assets/ingredients/default_images/${ingredient.name.toLowerCase()}`}
                alt={ingredient.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/api/assets/ingredients/default_images/placeholder';
                }}
              />
            ) : (
              <IngredientImage 
                name={ingredient.name}
                category={ingredient.category}
              />
            )}
              <span>
                <strong>{ingredient.name}</strong>
                {ingredient.quantity != null && ` - ${ingredient.quantity} ${ingredient.unit}`}
                {ingredient.category && ` (${ingredient.category})`}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => openEditModal(ingredient)}
                className="text-blue-500 hover:underline hover:decoration-blue-500"
              >
                ✏️
              </button>
              <button
                onClick={() => removeIngredient(ingredient.id)}
                className="text-red-500 hover:underline hover:decoration-red-700"
              >
                ❌
              </button>
            </div>
          </li>
        ))}
      </ul>

      <EditIngredientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ingredient={editingIngredient}
        onSave={handleUpdate}
      />

      {/* Allergy Manager */}
      <div>
      <AllergyManager userId={user.id} />
      </div>
      <div>
      <RecipeSuggestions userId={user.id} />
      </div>

    </div>
  );
}
