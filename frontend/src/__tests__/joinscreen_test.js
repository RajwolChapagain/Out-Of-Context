/* joinscreen_test.js - includes 4 unit tests for UI/animation behavior:
* 1) loading state, 2) onJoin function, 3) cleanup behavior, 4) loading transition
*  Uses Jest (testing framework for JS) and React Testing Library (testing React components)
* Run just this file once in frontend: npm test -- --runTestsByPath src/__tests__/joinscreen_test.js
* RUN ALL TESTS: npm test
*/

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import JoinScreen from '../JoinScreen';

// Test that the loading state is shown and the join button is disabled
test('shows loading state and disables join button edge case', () => {
  const onJoin = jest.fn();
  render(<JoinScreen onJoin={onJoin} loading={true} />);

  const button = screen.getByRole('button', { name: 'JOINING...' });
  expect(button).toBeDisabled();

  fireEvent.click(button);
  expect(onJoin).not.toHaveBeenCalled();
});

// Test that the onJoin function is called when the join button is clicked
test('calls onJoin when join button is clicked', () => {
  const onJoin = jest.fn();
  render(<JoinScreen onJoin={onJoin} loading={false} />);

  const button = screen.getByRole('button', { name: 'JOIN SERVER' });
  expect(button).toBeEnabled();

  fireEvent.click(button);
  expect(onJoin).toHaveBeenCalledTimes(1);
});

// Test cleanup behavior for resize listener + animation frame
test('cleans up animation frame and resize listener on unmount', () => {
  const onJoin = jest.fn();
  const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 123);
  const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const addSpy = jest.spyOn(window, 'addEventListener');
  const removeSpy = jest.spyOn(window, 'removeEventListener');

  const { unmount } = render(<JoinScreen onJoin={onJoin} loading={false} />);
  expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

  unmount(); 
  expect(cancelSpy).toHaveBeenCalledWith(123);
  expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

  rafSpy.mockRestore();
  cancelSpy.mockRestore();
  addSpy.mockRestore();
  removeSpy.mockRestore();
});

// Test loading transition (false -> true) using rerender
test('updates button state and blocks join after loading rerender', () => {
  const onJoin = jest.fn();
  const { rerender } = render(<JoinScreen onJoin={onJoin} loading={false} />);

  const initialButton = screen.getByRole('button', { name: 'JOIN SERVER' });
  expect(initialButton).toBeEnabled();
  fireEvent.click(initialButton);
  expect(onJoin).toHaveBeenCalledTimes(1);

  rerender(<JoinScreen onJoin={onJoin} loading={true} />);

  // Finds the loading button and checks that it is disabled
  const loadingButton = screen.getByRole('button', { name: 'JOINING...' });
  // Checks that the onJoin function was not called again
  expect(loadingButton).toBeDisabled();
  fireEvent.click(loadingButton);
  expect(onJoin).toHaveBeenCalledTimes(1);
});
