import React, { useState, useEffect } from 'react';

const ingredientNames = ["beans", "beef", "butter", "cheese", "chicken", "eggs", "fish", "flour", "garlic", "herbs", "milk", "oil", "onions", "pepper", "pork", "rice", "salt", "sugar", "tomatoes", "vinegar", "water"];
const ingredientCategories = ["vegetable", "fruit", "meat", "dairy", "grain", "spice", "condiment", "frozen"];
const ingredientUnits = ["g", "kg", "ml", "l", "cup", "tbsp", "tsp", "oz", "lb"];

export default function EditIngredientModal({ isOpen, onClose, ingredient, onSave }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
  });

  useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name || '',
        category: ingredient.category || '',
        quantity: ingredient.quantity ?? '',
        unit: ingredient.unit || '',
      });
    }
  }, [ingredient]);

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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...ingredient,
      name: form.name.trim(),
      category: form.category.trim(),
      quantity: form.quantity ? parseFloat(form.quantity) : null,
      unit: form.unit.trim(),
    });
    onClose();
  };

  const handleCancel = () => {
    if (ingredient) {
      setForm({
        name: ingredient.name || '',
        category: ingredient.category || '',
        quantity: ingredient.quantity ?? '',
        unit: ingredient.unit || '',
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">✏️ Edit Ingredient</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <label className="block font-medium">Name</label>
          <div>
          <input
            list="name"
            placeholder="Allergy name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <datalist id="name">
            {ingredientNames.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>


          {/* Category */}
          <label className="block font-medium">Category</label>
          <div>
            <input
              list="category"
              placeholder="Category (optional)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={`w-full border rounded p-2 ${
                form.name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              disabled={form.name === ''}
            />
            <datalist id="category">
              {ingredientCategories.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          {/* Quantity */}
          <label className="block font-medium">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            className={`w-full border rounded p-2 ${
              form.name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
            }`}
            step="any"
            min="0"
            disabled={form.name === ''}
          />

          {/* Unit */}
          <label className="block font-medium">Unit</label>
          <div>
            <input
              list="unit"
              placeholder="Unit (optional)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className={`w-full border rounded p-2 ${
                form.quantity === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              disabled={form.quantity === '' || isNaN(Number(form.quantity))}
            />
            <datalist id="unit">
              {ingredientUnits.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white ${
                form.name
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              disabled={!form.name}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
