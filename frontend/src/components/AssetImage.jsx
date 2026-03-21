import { useState, useEffect } from 'react';

export default function AssetImage({ name, category, assetType, userId }) {
  const [loaded, setLoaded] = useState(false);
  const [userSpecificFailed, setUserSpecificFailed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setUserSpecificFailed(false);
    setFailed(false);
  }, [name, category, userId]);

  const formattedName = category?.trim()
    ? `${name.trim().toLowerCase()}_${category.trim().toLowerCase()}`
    : name.trim().toLowerCase();

  const base = `${process.env.REACT_APP_API_URL || ''}/api/assets/${assetType}/generated_images`;

  const src = userId && !userSpecificFailed
    ? `${base}/${userId}_${formattedName}`
    : `${base}/${formattedName}`;

  const handleError = () => {
    if (userId && !userSpecificFailed) {
      setUserSpecificFailed(true);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-gray-400 text-lg">
        🍽️
      </div>
    );
  }

  return (
    <div className="w-10 h-10">
      {!loaded && (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
      <img
        src={src}
        alt={name}
        style={{ display: loaded ? 'block' : 'none' }}
        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
