import axios from 'axios';
import { useState, useEffect } from 'react';
import EditAllergyModal from './EditAllergyModal';

const allergyCategories = ["food", "environmental", "medication"];
const commonAllergies = ["peanuts", "tree nuts", "milk", "eggs", "wheat", "soy", "fish", "shellfish"];

function AllergyImage({ name, category }) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  const generateImageUrl = () => {
    const formattedName = category?.trim()
      ? `${name.trim().toLowerCase()}_${category.trim().toLowerCase()}`
      : name.trim().toLowerCase();
    return `/api/assets/allergies/generated_images/${formattedName}?&t=${Date.now()}`;
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
        e.target.src = '/api/assets/allergies/default_images/placeholder';
      }}
    />
  );
}


export default function AllergyManager({ userId }) {
  const [allergies, setAllergies] = useState([]);
  const [form, setForm] = useState({ allergy_name: '', allergy_category: '' });
  const [formDebounced, setFormDebounced] = useState(form);
  const [editingAllergy, setEditingAllergy] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Debounce form inputs for 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setFormDebounced(form);
    }, 300);
    return () => clearTimeout(handler);
  }, [form]);

  // Fetch allergies for the user
  useEffect(() => {
    fetch(`/api/users/${userId}/allergies/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllergies(data.data);
        }
      });
  }, [userId]);

  useEffect(() => {
    // If name is cleared, also clear category
    if (form.allergy_name === '') {
      setForm((prev) => ({
        ...prev,
        allergy_category: '',
      }));
    }
  }, [form.allergy_name]);

  const isValid = () => {
    const allergyName = formDebounced.allergy_name.trim();
    return allergyName !== '';
  };

  // Add allergy
  const addAllergy = () => {
    const allergyName = form.allergy_name.trim();
    const allergyCategory = form.allergy_category.trim();

    const exists = allergies.some(
      (a) =>
        a.allergy_name.toLowerCase() === allergyName.toLowerCase() &&
        a.allergy_category.toLowerCase() === allergyCategory.toLowerCase()
    );
  
    if (exists) {
      alert("This allergy already exists.");
      return;
    }
  
    const allergyData = {
      allergy_name: allergyName,
      allergy_category: allergyCategory,
    };

    fetch(`/api/users/${userId}/allergies/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allergyData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllergies((prev) => [...prev, data.data]);
          setForm({ allergy_name: '', allergy_category: '' });
        }
      });
  };

  const openEditModal = (allergy) => {
    setEditingAllergy(allergy);
    setIsEditModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAllergy(null);
  };

  const saveEditedAllergy = (updatedAllergy) => {
    // Update state immediately for UI responsiveness
    setAllergies((prev) =>
      prev.map((a) => (a.id === updatedAllergy.id ? updatedAllergy : a))
    );
  
    // Optionally send PATCH to backend to persist changes
    fetch(`/api/users/${userId}/allergies/${updatedAllergy.id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allergy_name: updatedAllergy.allergy_name,
        allergy_category: updatedAllergy.allergy_category,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          alert("Failed to update allergy on server.");
          // Optionally revert UI update or refresh allergies from server
        }
      })
      .catch(() => alert("Network error while updating allergy."));
    
    closeEditModal();
  };
  

  // Delete allergy with confirmation
  const deleteAllergy = async (id) => {
    if (!window.confirm("Are you sure you want to delete this allergy?")) return;
    try {
      await axios.delete(`/api/users/${userId}/allergies/${id}/`);
      setAllergies((prev) => prev.filter(ing => ing.id !== id));
    } catch (error) {
      console.error('Error deleting allergy:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addAllergy();
  };


  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-semibold mb-4">🚫 Manage Allergies (optional)</h3>

      {/* Allergy form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 mb-4">
        <label htmlFor="allergy_name" className="sr-only">Allergy name</label>
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

        <label htmlFor="allergy_category" className="sr-only">Category</label>
        <div>
          <input
            list="allergy_category"
            placeholder="Category (optional)"
            value={form.allergy_category}
            onChange={(e) => setForm({ ...form, allergy_category: e.target.value })}
            className={`border p-2 rounded w-full ${form.allergy_name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            disabled={form.allergy_name === ''}
          />
          <datalist id="allergy_category">
            {allergyCategories.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        <button
          type="submit"
          disabled={!isValid()}
          className={`col-span-2 p-2 rounded text-white transition
            ${isValid() ? 'bg-teal-500 hover:bg-teal-600' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          ➕ Add Allergy
        </button>
      </form>

      {/* Allergy list */}
      <ul className="divide-y">
        {allergies.map((allergy) => (
          <li key={allergy.id} className="py-2 flex justify-between items-center">
            <div className="flex items-center gap-3">
            {commonAllergies.map(allergy_name => allergy_name.toLowerCase()).includes(allergy.allergy_name.toLowerCase()) ? (
              <img
                src={`/api/assets/allergies/default_images/${allergy.allergy_name.toLowerCase()}`}
                alt={allergy.allergy_name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/api/assets/allergies/default_images/placeholder';
                }}
              />
            ) : (
              <AllergyImage 
                key={allergy.id + "-" + allergy.allergy_name}
                name={allergy.allergy_name}
                category={allergy.allergy_category}
              />
            )}
            <span>
              <strong>{allergy.allergy_name}</strong>
              {allergy.allergy_category && ` (${allergy.allergy_category})`}
            </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => openEditModal(allergy)}
                className="text-blue-500 hover:underline hover:decoration-blue-500"
                aria-label={`Edit allergy ${allergy.allergy_name}`}
              >
                ✏️
              </button>
              <button
                onClick={() => deleteAllergy(allergy.id)}
                className="text-red-500 hover:underline hover:decoration-red-700"
                aria-label={`Delete allergy ${allergy.allergy_name}`}
              >
                ❌
              </button>
            </div>
          </li>
        ))}
      </ul>

      <EditAllergyModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        allergy={editingAllergy}
        onSave={saveEditedAllergy}
      />

    </div>
  );
}
