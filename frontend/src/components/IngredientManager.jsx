import api from '../axios';
import React, { useState, useEffect, useCallback } from 'react';
import AllergyManager from './AllergyManager';
import EditIngredientModal from './EditIngredientModal';
import RecipeSuggestions from './RecipeSuggestions';
import CreatableSelect from 'react-select/creatable';
import AssetImage from './AssetImage';
import ScanImageModal from './ScanImageModal';

import { ingredientOptions, categoryOptions, unitOptions } from '../constants';

export default function IngredientManager({ user }) {
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', category: '' });
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [searchDebounced, setSearchDebounced] = useState('');
  const [categoryFilterDebounced, setCategoryFilterDebounced] = useState('');
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanDuplicateMsg, setScanDuplicateMsg] = useState('');
  const [scannedIds, setScannedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`scanned_ingredient_ids_${user.id}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  const saveScannedIds = (ids) => {
    localStorage.setItem(`scanned_ingredient_ids_${user.id}`, JSON.stringify([...ids]));
  };

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

  const fetchIngredients = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchDebounced) queryParams.append('q', searchDebounced);
      if (categoryFilterDebounced) queryParams.append('category', categoryFilterDebounced);

      const res = await api.get(`/api/users/${user.id}/ingredients/search/?${queryParams}`);
      setIngredients(res.data.data);
    } catch (error) {
      setFormError('Failed to load ingredients.');
    }
  }, [searchDebounced, categoryFilterDebounced, user.id]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

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
      setFormError("This ingredient already exists.");
      return;
    }
    setFormError('');

    const ingredientData = {
      ...form,
      name: finalName,
      unit: finalUnit,
      category: finalCategory,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
    };

    api.post(`/api/users/${user.id}/ingredients/`, ingredientData)
      .then((response) => {
        const data = response.data;
        if (data.success) {
          setIngredients((prev) => [...prev, data.data]);
          setForm({ name: '', quantity: '', unit: '', category: '' });
          setFormError('');
        } else {
          setFormError("Failed to add ingredient: " + (data.error || "Unknown error"));
        }
      })
      .catch(() => {
        setFormError("Failed to add ingredient.");
      });
  };

  const openEditModal = (ingredient) => {
    setEditingIngredient(ingredient);
    setIsModalOpen(true);
  };
  
  const handleUpdate = async (updatedIngredient) => {
    try {
      const res = await api.put(`/api/users/${user.id}/ingredients/${updatedIngredient.id}/`, updatedIngredient);
      const data = res.data;
      if (data.success) {
        setIngredients((prev) =>
          prev.map((ing) => (ing.id === updatedIngredient.id ? updatedIngredient : ing))
        );
        // If name or category changed, remove the scan badge for the old name
        if (editingIngredient) {
          setScannedIds(prev => {
            const next = new Set(prev);
            next.delete(editingIngredient.id);
            saveScannedIds(next);
            return next;
          });
        }
      }
    } catch {
      setFormError("Failed to update ingredient.");
    }
  };

  const removeIngredient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ingredient?")) return;
    try {
      const ing = ingredients.find(i => i.id === id);
      await api.delete(`/api/users/${user.id}/ingredients/${id}/`);
      setIngredients((prev) => prev.filter(i => i.id !== id));
      if (ing) {
        setScannedIds(prev => {
          const next = new Set(prev);
          next.delete(ing.id);
          saveScannedIds(next);
          return next;
        });
      }
    } catch {
      setFormError("Failed to delete ingredient.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addIngredient();
  };

  const handleScanConfirmed = async (items) => {
    const newItems = items.filter(
      item => !ingredients.some(i =>
        i.name.toLowerCase() === item.name.toLowerCase() &&
        (i.category?.toLowerCase() || '') === (item.category?.toLowerCase() || '')
      )
    );
    const duplicateCount = items.length - newItems.length;

    // Only upload icons for new items so existing icons are not overwritten
    await Promise.all(newItems.map(item =>
      item.croppedImage
        ? api.post(`/api/assets/ingredients/upload-icon/`, {
            image: item.croppedImage,
            name: item.name,
            category: item.category || '',
          }).catch(() => {})
        : Promise.resolve()
    ));

    const addedIds = [];
    for (const item of newItems) {
      try {
        const res = await api.post(`/api/users/${user.id}/ingredients/`, {
          name: item.name,
          category: item.category || '',
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unit: item.unit || '',
          skip_icon: true,
        });
        if (res.data.success) {
          setIngredients((prev) => [...prev, res.data.data]);
          addedIds.push(res.data.data.id);
        }
      } catch {
        // skip failed items silently
      }
    }

    if (addedIds.length > 0) {
      setScannedIds(prev => {
        const next = new Set(prev);
        addedIds.forEach(id => next.add(id));
        saveScannedIds(next);
        return next;
      });
    }

    if (duplicateCount > 0) {
      setScanDuplicateMsg(
        `${duplicateCount} item${duplicateCount !== 1 ? 's were' : ' was'} already in your list and ${duplicateCount !== 1 ? 'were' : 'was'} skipped.`
      );
    }
  };

  const categorySelectOptions = categoryOptions.map((cat) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-300 via-orange-400 via-pink-400 to-purple-500 animate-gradient-x pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🧾 Manage Ingredients</h2>
            <p className="text-gray-600 mb-4">Add and organize your ingredients</p>
            <button
              onClick={() => setShowScanModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              📷 Scan Food Items
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3 mb-6">
            <label htmlFor="search" className="sr-only">Search ingredients</label>
            <input
              id="search"
              type="text"
              className="flex-grow px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
              placeholder="🔍 Search ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label htmlFor="categoryFilter" className="sr-only">Category filter</label>
            <div className="w-1/3">
              <CreatableSelect
                className="text-sm"
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
                styles={{
                  control: (provided) => ({
                    ...provided,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    '&:hover': {
                      border: '1px solid #10b981'
                    }
                  })
                }}
              />
            </div>
          </div>

          {/* Add Ingredient Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Ingredient name</label>
                <input
                  list="name"
                  placeholder="Enter ingredient name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                />
                <datalist id="name">
                  {ingredientOptions.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">Quantity (optional)</label>
                <input
                  id="quantity"
                  className={`block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ${
                    form.name === ''
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : ''
                  }`}
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  type="number"
                  step="any"
                  min="0"
                  disabled={
                    form.name === ''
                  }
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">Unit (optional)</label>
                <input
                  list="unit"
                  placeholder="Enter unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className={`block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ${form.quantity === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  disabled={form.quantity === '' || isNaN(Number(form.quantity))}
                />
                <datalist id="unit">
                  {unitOptions.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Category (optional)</label>
                <input
                  list="category"
                  placeholder="Enter category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={`block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 ${form.name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  disabled={form.name === ''}
                />
                <datalist id="category">
                  {categoryOptions.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid()}
              className={`w-full font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isValid() 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white focus:ring-green-500' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed transform-none'
              }`}
            >
              ➕ Add Ingredient
            </button>
            {formError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{formError}</p>
              </div>
            )}
          </form>

          {/* Ingredient List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Ingredients</h3>
            {scanDuplicateMsg && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
                <p className="text-amber-800 text-sm">ℹ️ {scanDuplicateMsg}</p>
                <button onClick={() => setScanDuplicateMsg('')} className="text-amber-400 hover:text-amber-600 ml-3 text-lg leading-none">✕</button>
              </div>
            )}
            {ingredients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No ingredients yet. Add some above!</p>
            ) : (
              <ul className="space-y-3">
                {ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 transition duration-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AssetImage
                          assetType="ingredients"
                          name={ingredient.name}
                          category={ingredient.category}
                          userId={user.id}
                        />
                        {scannedIds.has(ingredient.id) && (
                          <span className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center" title="Added via scan">📷</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{ingredient.name}</span>
                        {ingredient.quantity != null && (
                          <span className="text-gray-600"> - {ingredient.quantity} {ingredient.unit}</span>
                        )}
                        {ingredient.category && (
                          <span className="text-gray-500 text-sm block">({ingredient.category})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(ingredient)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition duration-200"
                        title="Edit ingredient"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeIngredient(ingredient.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-200"
                        title="Delete ingredient"
                      >
                        ❌
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <EditIngredientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ingredient={editingIngredient}
        onSave={handleUpdate}
      />

      {/* Allergy Manager */}
      <AllergyManager userId={user.id} />

      {/* Recipe Suggestions */}
      <RecipeSuggestions user={user} />

      {showScanModal && (
        <ScanImageModal
          userId={user.id}
          scanType="ingredients"
          onItemsConfirmed={handleScanConfirmed}
          onClose={() => setShowScanModal(false)}
        />
      )}

    </div>
  );
}
