// src/components/UserLayout.jsx
import React from 'react';

export default function UserLayout({ children }) {
  return (
    <div className="pt-16 px-4"> {/* Adjust padding as needed */}
      {children}
    </div>
  );
}
