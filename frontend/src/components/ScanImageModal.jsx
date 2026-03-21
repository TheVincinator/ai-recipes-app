import React, { useState, useRef } from 'react';
import api from '../axios';

function cropItemFromImage(imageDataUrl, bbox) {
  return new Promise((resolve) => {
    if (!bbox || bbox.length !== 4) {
      resolve(imageDataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const [x1p, y1p, x2p, y2p] = bbox;
      const x1 = (x1p / 100) * img.width;
      const y1 = (y1p / 100) * img.height;
      const x2 = (x2p / 100) * img.width;
      const y2 = (y2p / 100) * img.height;

      const w = x2 - x1;
      const h = y2 - y1;
      const side = Math.max(w, h);
      const cx = x1 + w / 2;
      const cy = y1 + h / 2;

      let sx = Math.max(0, cx - side / 2);
      let sy = Math.max(0, cy - side / 2);
      let sw = Math.min(side, img.width - sx);
      let sh = Math.min(side, img.height - sy);

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

export default function ScanImageModal({ userId, scanType, onItemsConfirmed, onClose }) {
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setImageData(ev.target.result);
      setDetectedItems(null);
      setEditedItems([]);
      setSelectedItems([]);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageData) return;
    setScanning(true);
    setError('');
    try {
      const res = await api.post(`/api/users/${userId}/scan-image/`, {
        image: imageData,
        scan_type: scanType,
      });
      const { items } = res.data.data;
      if (!items || items.length === 0) {
        setError('No items detected in the image. Try a clearer photo.');
        setDetectedItems([]);
      } else {
        setDetectedItems(items);
        setEditedItems(items.map(item => ({ ...item, quantity: '', unit: '' })));
        setSelectedItems(items.map((_, i) => i));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to scan image.');
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (idx) => {
    setSelectedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const updateItem = (idx, field, value) => {
    setEditedItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleConfirm = async () => {
    const chosen = editedItems.filter((_, i) => selectedItems.includes(i));
    const itemsWithCrops = await Promise.all(
      chosen.map(async (item) => ({
        ...item,
        croppedImage: await cropItemFromImage(imageData, item.bbox),
      }))
    );
    onItemsConfirmed(itemsWithCrops);
    onClose();
  };

  const title = scanType === 'allergies' ? 'Scan for Allergens' : 'Scan Food Items';
  const description =
    scanType === 'allergies'
      ? 'Take or upload a photo to detect allergens'
      : 'Take or upload a photo to detect ingredients';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">📷 {title}</h2>
        <p className="text-gray-500 text-sm mb-5">{description}</p>

        {/* Upload area */}
        {!preview && (
          <div
            onClick={() => fileInputRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition"
          >
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-600 font-medium">Click to upload a photo</p>
            <p className="text-gray-400 text-xs mt-1">JPEG, PNG, WEBP, GIF supported</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview */}
        {preview && (
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-lg object-contain max-h-64 border border-gray-200"
            />
            <button
              onClick={() => {
                setPreview(null);
                setImageData(null);
                setDetectedItems(null);
                setSelectedItems([]);
                setError('');
                fileInputRef.current.value = '';
              }}
              className="mt-2 text-sm text-gray-400 hover:text-red-500 transition"
            >
              Remove image
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Scan button */}
        {preview && !detectedItems && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`w-full py-3 rounded-lg font-semibold text-white transition mb-4 ${
              scanning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {scanning ? '🔍 Scanning...' : '🔍 Scan Image'}
          </button>
        )}

        {/* Detected items */}
        {detectedItems && detectedItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Detected {scanType === 'allergies' ? 'allergens' : 'items'} — edit and select which to add:
            </p>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {editedItems.map((item, idx) => (
                <li
                  key={idx}
                  className={`px-3 py-3 rounded-lg border transition ${
                    selectedItems.includes(idx)
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(idx)}
                      onChange={() => toggleItem(idx)}
                      className="accent-purple-600 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1 px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                    />
                  </div>
                  <div className={`grid gap-2 pl-6 ${scanType === 'ingredients' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                    <input
                      type="text"
                      value={item.category}
                      onChange={e => updateItem(idx, 'category', e.target.value)}
                      placeholder="Category (optional)"
                      className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white text-gray-600"
                    />
                    {scanType === 'ingredients' && (
                      <>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          placeholder="Qty (optional)"
                          min="0"
                          step="any"
                          className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white text-gray-600"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                          placeholder="Unit (optional)"
                          className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white text-gray-600"
                        />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleConfirm}
                disabled={selectedItems.length === 0}
                className={`flex-1 py-3 rounded-lg font-semibold text-white transition ${
                  selectedItems.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => {
                  setDetectedItems(null);
                  setEditedItems([]);
                  setSelectedItems([]);
                }}
                className="px-4 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
              >
                Re-scan
              </button>
            </div>
          </div>
        )}

        {detectedItems && detectedItems.length === 0 && !error && (
          <button
            onClick={() => {
              setPreview(null);
              setImageData(null);
              setDetectedItems(null);
              fileInputRef.current.value = '';
            }}
            className="w-full py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            Try another image
          </button>
        )}
      </div>
    </div>
  );
}
