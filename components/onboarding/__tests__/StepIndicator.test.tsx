import { render, screen, fireEvent } from '@testing-library/react';
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

  it('does not render step buttons when onStepClick is omitted', () => {
    render(<StepIndicator currentStep={1} totalSteps={3} labels={THREE_LABELS} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('calls onStepClick with the step number when a step button is clicked', () => {
    const onStepClick = jest.fn();
    render(
      <StepIndicator
        currentStep={2}
        totalSteps={3}
        labels={THREE_LABELS}
        onStepClick={onStepClick}
        isStepDisabled={() => false}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[0]);
    expect(onStepClick).toHaveBeenCalledWith(1);
    fireEvent.click(buttons[2]);
    expect(onStepClick).toHaveBeenCalledWith(3);
  });

  it('does not call onStepClick for disabled steps', () => {
    const onStepClick = jest.fn();
    render(
      <StepIndicator
        currentStep={1}
        totalSteps={3}
        labels={THREE_LABELS}
        onStepClick={onStepClick}
        isStepDisabled={(s) => s === 3}
      />
    );
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
