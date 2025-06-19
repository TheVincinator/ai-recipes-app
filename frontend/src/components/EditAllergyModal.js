import React, { useState, useEffect } from 'react';

const allergyCategories = ["food", "environmental", "medication"];
const commonAllergies = ["peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish"];

export default function EditAllergyModal({ isOpen, onClose, allergy, onSave }) {
  const [form, setForm] = useState({
    allergy_name: '',
    allergy_category: '',
  });

  useEffect(() => {
    if (allergy) {
      setForm({
        allergy_name: commonAllergies.includes(allergy.allergy_name) ? allergy.allergy_name : '',
        allergy_category: allergyCategories.includes(allergy.allergy_category) ? allergy.allergy_category : '',
      });
    }
  }, [allergy]);

  useEffect(() => {
    // If name is cleared, also clear category
    if (form.allergy_name === '') {
      setForm((prev) => ({
        ...prev,
        allergy_category: '',
      }));
    }
  }, [form.allergy_name]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();

    onSave({ 
      ...allergy, 
      allergy_name: form.allergy_name.trim(), 
      allergy_category: form.allergy_category.trim() 
    });

    onClose();
  };

  const handleCancel = () => {
    if (allergy) {
      setForm({
        allergy_name: commonAllergies.includes(allergy.allergy_name) ? allergy.allergy_name : '',
        allergy_category: allergyCategories.includes(allergy.allergy_category) ? allergy.allergy_category : '',
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <form 
        onSubmit={handleSave} 
        className="bg-white rounded-lg shadow-lg p-6 w-96 space-y-4"
      >
        <h3 className="text-lg font-semibold">✏️ Edit Allergy</h3>

        {/* Allergy Name Dropdown */}
        <div>
            <input
              list="allergy_name"
              placeholder="Allergy name"
              value={form.allergy_name}
              onChange={(e) => setForm({ ...form, allergy_name: e.target.value })}
              className="border p-2 rounded w-full"
            />
            <datalist id="allergy_name">
              {commonAllergies.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>


        {/* Allergy Category Dropdown */}
        <div>
            <input
              list="allergy_category"
              placeholder="Category (optional)"
              value={form.allergy_category}
              onChange={(e) => setForm({ ...form, allergy_category: e.target.value })}
              className={`w-full border rounded p-2 ${
                form.allergy_name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              disabled={form.allergy_name === ''}
            />
            <datalist id="allergy_category">
              {allergyCategories.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
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
              form.allergy_name
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            disabled={!form.allergy_name}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
