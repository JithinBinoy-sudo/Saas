import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from '../ModeSelector';

describe('ModeSelector', () => {
  it('renders both mode cards', () => {
    render(
      <ModeSelector selected={null} onSelect={() => {}} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByText(/upload excel only/i)).toBeInTheDocument();
    expect(screen.getByText(/bring your supabase/i)).toBeInTheDocument();
  });

  it('calls onSelect with "hosted" when Excel card clicked', () => {
    const onSelect = jest.fn();
    render(
      <ModeSelector selected={null} onSelect={onSelect} onBack={() => {}} onContinue={() => {}} />
    );
    fireEvent.click(screen.getByTestId('mode-card-hosted'));
    expect(onSelect).toHaveBeenCalledWith('hosted');
  });

  it('calls onSelect with "byos" when Supabase card clicked', () => {
    const onSelect = jest.fn();
    render(
      <ModeSelector selected={null} onSelect={onSelect} onBack={() => {}} onContinue={() => {}} />
    );
    fireEvent.click(screen.getByTestId('mode-card-byos'));
    expect(onSelect).toHaveBeenCalledWith('byos');
  });

  it('highlights the selected card via data-selected attribute', () => {
    render(
      <ModeSelector selected="hosted" onSelect={() => {}} onBack={() => {}} onContinue={() => {}} />
    );
    expect(screen.getByTestId('mode-card-hosted')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('mode-card-byos')).toHaveAttribute('data-selected', 'false');
  });
});
