import api from '../axios';
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
    return `${process.env.REACT_APP_API_URL}/api/assets/allergies/generated_images/${formattedName}?&t=${Date.now()}`;
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
      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = `${process.env.REACT_APP_API_URL}/api/assets/allergies/default_images/placeholder`;
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
    api.get(`/api/users/${userId}/allergies/`)
      .then((response) => {
        const data = response.data;
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

    api.post(`/api/users/${userId}/allergies/`, allergyData)
      .then((response) => {
        const data = response.data;
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
    api.put(`/api/users/${userId}/allergies/${updatedAllergy.id}/`, {
      allergy_name: updatedAllergy.allergy_name,
      allergy_category: updatedAllergy.allergy_category,
    })
      .then(response => {
        const data = response.data;
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
      await api.delete(`/api/users/${userId}/allergies/${id}/`);
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
    <div className="max-w-2xl mx-auto mb-12">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-gray-900 mb-2">Manage Allergies</h3>
          <p className="text-gray-600">Add your allergies for safer recipe suggestions</p>
        </div>

        {/* Allergy form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="allergy_name" className="block text-sm font-medium text-gray-700 mb-2">Allergy name</label>
              <input
                list="allergy_name"
                placeholder="Enter allergy name"
                value={form.allergy_name}
                onChange={(e) => setForm({ ...form, allergy_name: e.target.value })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200"
              />
              <datalist id="allergy_name">
                {commonAllergies.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="allergy_category" className="block text-sm font-medium text-gray-700 mb-2">Category (optional)</label>
              <input
                list="allergy_category"
                placeholder="Enter category"
                value={form.allergy_category}
                onChange={(e) => setForm({ ...form, allergy_category: e.target.value })}
                className={`block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200 ${form.allergy_name === '' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                disabled={form.allergy_name === ''}
              />
              <datalist id="allergy_category">
                {allergyCategories.map((u) => (
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
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white focus:ring-teal-500' 
                : 'bg-gray-400 text-gray-200 cursor-not-allowed transform-none'
            }`}
          >
            Add Allergy
          </button>
        </form>

        {/* Allergy list */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Allergies</h4>
          {allergies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No allergies yet. Add some above!</p>
          ) : (
            <ul className="space-y-3">
              {allergies.map((allergy) => (
                <li key={allergy.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 transition duration-200">
                  <div className="flex items-center gap-3">
                  {commonAllergies.map(allergy_name => allergy_name.toLowerCase()).includes(allergy.allergy_name.toLowerCase()) ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/api/assets/allergies/default_images/${allergy.allergy_name.toLowerCase()}`}
                      alt={allergy.allergy_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${process.env.REACT_APP_API_URL}/api/assets/allergies/default_images/placeholder`;
                      }}
                    />
                  ) : (
                    <AllergyImage 
                      key={allergy.id + "-" + allergy.allergy_name}
                      name={allergy.allergy_name}
                      category={allergy.allergy_category}
                    />
                  )}
                  <div>
                    <span className="font-medium text-gray-900">{allergy.allergy_name}</span>
                    {allergy.allergy_category && (
                      <span className="text-gray-500 text-sm block">({allergy.allergy_category})</span>
                    )}
                  </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(allergy)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition duration-200"
                      aria-label={`Edit allergy ${allergy.allergy_name}`}
                      title="Edit allergy"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteAllergy(allergy.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-200"
                      aria-label={`Delete allergy ${allergy.allergy_name}`}
                      title="Delete allergy"
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

      <EditAllergyModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        allergy={editingAllergy}
        onSave={saveEditedAllergy}
      />

    </div>
  );
}
