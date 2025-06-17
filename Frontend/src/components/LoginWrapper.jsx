// LoginWrapper.jsx (inside App.jsx or separate file)
function LoginWrapper({ onLogin }) {
  const navigate = useNavigate();

  const handleLogin = (user) => {
    onLogin(user);
    navigate('/profile');  // Redirect after login
  };

  return (
    <>
      <LoginForm onLogin={handleLogin} />
      <p className="text-center mt-2">
        Don't have an account?{' '}
        <button className="text-blue-500" onClick={() => navigate('/signup')}>
          Sign up
        </button>
      </p>
    </>
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
    <>
      <SignupForm onSignup={handleSignup} />
      <p className="text-center mt-2">
        Already have an account?{' '}
        <button className="text-blue-500" onClick={() => navigate('/login')}>
          Log in
        </button>
      </p>
    </>
  );
}
