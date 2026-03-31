import { render, screen } from '@testing-library/react';
import App from './App';

test('prikazuje naslov prijave', () => {
  render(<App />);
  const naslov = screen.getByText(/bakovicapp - prijava/i);
  expect(naslov).toBeInTheDocument();
});
