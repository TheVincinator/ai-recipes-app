import api from '../axios';
import { useState, useEffect } from 'react';
import EditAllergyModal from './EditAllergyModal';
import AssetImage from './AssetImage';
import ScanImageModal from './ScanImageModal';

import { commonAllergies, allergyCategories } from '../constants';

export default function AllergyManager({ userId }) {
  const [allergies, setAllergies] = useState([]);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ allergy_name: '', allergy_category: '' });
  const [formDebounced, setFormDebounced] = useState(form);
  const [editingAllergy, setEditingAllergy] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanDuplicateMsg, setScanDuplicateMsg] = useState('');
  const [scannedIds, setScannedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`scanned_allergy_ids_${userId}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  const saveScannedIds = (ids) => {
    localStorage.setItem(`scanned_allergy_ids_${userId}`, JSON.stringify([...ids]));
  };

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
      })
      .catch((error) => {
        console.error('Error fetching allergies:', error);
        setFormError('Failed to load allergies.');
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
        (a.allergy_category || '').toLowerCase() === allergyCategory.toLowerCase()
    );
  
    if (exists) {
      setFormError("This allergy already exists.");
      return;
    }
    setFormError('');
  
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

    // If name or category changed, remove the scan badge
    if (editingAllergy) {
      setScannedIds(prev => {
        const next = new Set(prev);
        next.delete(editingAllergy.id);
        saveScannedIds(next);
        return next;
      });
    }

    // Optionally send PATCH to backend to persist changes
    api.put(`/api/users/${userId}/allergies/${updatedAllergy.id}/`, {
      allergy_name: updatedAllergy.allergy_name,
      allergy_category: updatedAllergy.allergy_category,
    })
      .then(response => {
        const data = response.data;
        if (!data.success) {
          setFormError("Failed to update allergy on server.");
        }
      })
      .catch(() => setFormError("Network error while updating allergy."));
    
    closeEditModal();
  };
  

  // Delete allergy with confirmation
  const deleteAllergy = async (id) => {
    if (!window.confirm("Are you sure you want to delete this allergy?")) return;
    try {
      const allergy = allergies.find(a => a.id === id);
      await api.delete(`/api/users/${userId}/allergies/${id}/`);
      setAllergies((prev) => prev.filter(a => a.id !== id));
      if (allergy) {
        setScannedIds(prev => {
          const next = new Set(prev);
          next.delete(allergy.id);
          saveScannedIds(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Error deleting allergy:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addAllergy();
  };

  const handleScanConfirmed = async (items) => {
    const newItems = items.filter(
      item => !allergies.some(a =>
        a.allergy_name.toLowerCase() === item.name.toLowerCase() &&
        (a.allergy_category?.toLowerCase() || '') === (item.category?.toLowerCase() || '')
      )
    );
    const duplicateCount = items.length - newItems.length;

    // Only upload icons for new items so existing icons are not overwritten
    await Promise.all(newItems.map(item =>
      item.croppedImage
        ? api.post(`/api/assets/allergies/upload-icon/`, {
            image: item.croppedImage,
            name: item.name,
            category: item.category || '',
          }).catch(() => {})
        : Promise.resolve()
    ));

    const addedIds = [];
    for (const item of newItems) {
      try {
        const res = await api.post(`/api/users/${userId}/allergies/`, {
          allergy_name: item.name,
          allergy_category: item.category || '',
          skip_icon: true,
        });
        if (res.data.success) {
          setAllergies((prev) => [...prev, res.data.data]);
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
        `${duplicateCount} allergen${duplicateCount !== 1 ? 's were' : ' was'} already in your list and ${duplicateCount !== 1 ? 'were' : 'was'} skipped.`
      );
    }
  };


  return (
    <div className="max-w-2xl mx-auto mb-12">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-gray-900 mb-2">Manage Allergies</h3>
          <p className="text-gray-600 mb-4">Add your allergies for safer recipe suggestions</p>
          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            📷 Scan for Allergens
          </button>
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

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{formError}</p>
            </div>
          )}
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
            {scanDuplicateMsg && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
                <p className="text-amber-800 text-sm">ℹ️ {scanDuplicateMsg}</p>
                <button onClick={() => setScanDuplicateMsg('')} className="text-amber-400 hover:text-amber-600 ml-3 text-lg leading-none">✕</button>
              </div>
            )}
          {allergies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No allergies yet. Add some above!</p>
          ) : (
            <ul className="space-y-3">
              {allergies.map((allergy) => (
                <li key={allergy.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 transition duration-200">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <AssetImage
                        assetType="allergies"

                        name={allergy.allergy_name}
                        category={allergy.allergy_category}
                        userId={userId}
                      />
                      {scannedIds.has(allergy.id) && (
                        <span className="absolute -bottom-1 -right-1 bg-teal-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center" title="Added via scan">📷</span>
                      )}
                    </div>
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

      {showScanModal && (
        <ScanImageModal
          userId={userId}
          scanType="allergies"
          onItemsConfirmed={handleScanConfirmed}
          onClose={() => setShowScanModal(false)}
        />
      )}

    </div>
  );
}
