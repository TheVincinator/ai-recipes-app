// LoginWrapper.jsx (inside App.jsx or separate file)
function LoginWrapper({ onLogin }) {
  const navigate = useNavigate();

  const handleLogin = (user) => {
    onLogin(user);
    navigate('/profile');  // Redirect after login
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center items-center py-12">
      <div className="w-full max-w-md">
        <LoginForm onLogin={handleLogin} />
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

// SignupWrapper.jsx
function SignupWrapper({ onSignup }) {
  const navigate = useNavigate();

  const handleSignup = (user) => {
    onSignup(user);
    navigate('/profile'); // Redirect after signup
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center items-center py-12">
      <div className="w-full max-w-md">
        <SignupForm onSignup={handleSignup} />
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
