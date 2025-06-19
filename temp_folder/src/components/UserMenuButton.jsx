import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, Bookmark, ChevronDown, List } from 'lucide-react'; // Added List icon

function UserMenuButton() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 transition"
      >
        <Menu className="w-5 h-5 text-gray-700" />
        <span className="text-gray-700 font-medium">Menu</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <button
            onClick={() => {
              navigate('/ingredients');
              setOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            <List className="w-4 h-4 mr-2" />
            Ingredients
          </button>
          <button
            onClick={() => {
              navigate('/saved');
              setOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Saved Recipes
          </button>
          <button
            onClick={() => {
              navigate('/profile');
              setOpen(false);
            }}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenuButton;
