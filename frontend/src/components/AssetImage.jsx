import { useState, useEffect, useRef } from 'react';

export default function AssetImage({ name, category, assetType, maxAttempts = 10 }) {
  const [attempts, setAttempts] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setAttempts(0);
    setLoaded(false);
    return () => clearTimeout(timerRef.current);
  }, [name, category]);

  const formattedName = category?.trim()
    ? `${name.trim().toLowerCase()}_${category.trim().toLowerCase()}`
    : name.trim().toLowerCase();

  const src = `${process.env.REACT_APP_API_URL}/api/assets/${assetType}/generated_images/${formattedName}?t=${attempts}`;
  const placeholder = `${process.env.REACT_APP_API_URL}/api/assets/${assetType}/default_images/placeholder`;

  const handleError = () => {
    if (attempts < maxAttempts) {
      timerRef.current = setTimeout(() => setAttempts(a => a + 1), 1000);
    }
  };

  return (
    <div className="w-10 h-10">
      {!loaded && attempts < maxAttempts && (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
      <img
        src={attempts >= maxAttempts ? placeholder : src}
        alt={name}
        style={{ display: loaded || attempts >= maxAttempts ? 'block' : 'none' }}
        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
