import api from '../axios';
import React, { useState } from 'react';

export function IngredientSearch({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const search = () => {
    api.get(`/api/users/${user.id}/ingredients/search/?q=${query}`)
      .then(res => setResults(res.data.data));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Search Ingredients</h2>
      <input className="border p-2 mr-2" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />
      <button onClick={search} className="bg-blue-600 text-white px-3 py-1 rounded">Search</button>
      <ul className="mt-4">
        {results.map(res => <li key={res.id}>{res.name}</li>)}
      </ul>
    </div>
  );
}

export default IngredientSearch;
