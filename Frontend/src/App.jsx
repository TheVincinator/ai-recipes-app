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
    <>
      <LoginForm onLogin={onLogin} />
      <p className="text-center mt-2">
        Don't have an account?{' '}
        <button className="text-blue-500" onClick={() => navigate('/signup')}>
          Sign up
        </button>
      </p>
    </>
  );
}

function SignupWrapper({ onSignup }) {
  const navigate = useNavigate();
  return (
    <>
      <SignupForm onSignup={onSignup} />
      <p className="text-center mt-2">
        Already have an account?{' '}
        <button className="text-blue-500" onClick={() => navigate('/login')}>
          Log in
        </button>
      </p>
    </>
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
