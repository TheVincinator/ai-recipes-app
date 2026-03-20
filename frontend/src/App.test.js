import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login form when not authenticated', () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
});
