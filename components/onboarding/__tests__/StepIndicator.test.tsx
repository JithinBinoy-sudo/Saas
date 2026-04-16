import { render, screen } from '@testing-library/react';
import { StepIndicator } from '../StepIndicator';

const FOUR_LABELS = ['Choose Mode', 'OpenAI Key', 'Column Mapping', 'Deploy Schema'];
const THREE_LABELS = ['Choose Mode', 'OpenAI Key', 'Column Mapping'];

describe('StepIndicator', () => {
  it('renders 4 steps when totalSteps=4', () => {
    render(<StepIndicator currentStep={1} totalSteps={4} labels={FOUR_LABELS} />);
    expect(screen.getAllByTestId(/^step-circle-/)).toHaveLength(4);
  });

  it('renders 3 steps when totalSteps=3', () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={THREE_LABELS} />);
    expect(screen.getAllByTestId(/^step-circle-/)).toHaveLength(3);
  });

  it('marks steps before currentStep as complete', () => {
    render(<StepIndicator currentStep={3} totalSteps={4} labels={FOUR_LABELS} />);
    expect(screen.getByTestId('step-circle-1')).toHaveAttribute('data-state', 'complete');
    expect(screen.getByTestId('step-circle-2')).toHaveAttribute('data-state', 'complete');
  });

  it('marks currentStep as active', () => {
    render(<StepIndicator currentStep={3} totalSteps={4} labels={FOUR_LABELS} />);
    expect(screen.getByTestId('step-circle-3')).toHaveAttribute('data-state', 'active');
  });

  it('marks steps after currentStep as pending', () => {
    render(<StepIndicator currentStep={2} totalSteps={4} labels={FOUR_LABELS} />);
    expect(screen.getByTestId('step-circle-3')).toHaveAttribute('data-state', 'pending');
    expect(screen.getByTestId('step-circle-4')).toHaveAttribute('data-state', 'pending');
  });
});
