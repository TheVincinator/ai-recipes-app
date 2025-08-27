import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import IngredientManager from './components/IngredientManager';
import IngredientSearch from './components/IngredientSearch';
import AllergyManager from './components/AllergyManager';
import RecipeSuggestions from './components/RecipeSuggestions';
import AccountSettings from './components/AccountSettings';
import UserMenuButton from './components/UserMenuButton';
import SavedRecipes from './components/SavedRecipes'; // Create this component if needed


// Wrapper components for navigation buttons
function LoginWrapper({ onLogin }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center items-center py-12">
      <div className="w-full max-w-md">
        <LoginForm onLogin={onLogin} />
        <p className="text-center mt-6 text-gray-600">
          Don't have an account yet?{' '}
          <button className="text-blue-600 hover:text-blue-800 font-medium underline transition duration-200" onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

function SignupWrapper({ onSignup }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center items-center py-12">
      <div className="w-full max-w-md">
        <SignupForm onSignup={onSignup} />
        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <button className="text-green-600 hover:text-green-800 font-medium underline transition duration-200" onClick={() => navigate('/login')}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <UserMenuButton />
        </div>
      )}

      {!user ? (
        <Routes>
          <Route path="/login" element={<LoginWrapper onLogin={setUser} />} />
          <Route path="/signup" element={<SignupWrapper onSignup={setUser} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <div className="pt-16 px-4"> {/* Adds spacing for fixed menu */}
          <Routes>
            <Route path="/ingredients" element={<IngredientManager user={user} />} />
            <Route path="/search" element={<IngredientSearch user={user} />} />
            <Route path="/allergies" element={<AllergyManager user={user} />} />
            <Route path="/recipes" element={<RecipeSuggestions user={user} />} />
            <Route path="/profile" element={<AccountSettings user={user} onLogout={() => setUser(null)} />} />
            <Route path="/saved" element={<SavedRecipes user={user} />} />
            <Route path="*" element={<Navigate to="/ingredients" />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
