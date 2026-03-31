/* voting_test.js - includes 2 unit tests for the Voting component: 1) vote options, 2) selected vote
* Uses Jest (testing framework for JS) and React Testing Library (testing React components)
* Run just this file once in frontend: npm test -- --runTestsByPath src/__tests__/voting_test.js
* RUN ALL TESTS: npm test
*/

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Voting from '../Voting';

// In order to mock supabase client, need to mock createClient function
jest.mock('@supabase/supabase-js', () => ({
  __mock: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
  createClient: jest.fn(() => ({
    from: (...args) => require('@supabase/supabase-js').__mock.from(...args),
    rpc: (...args) => require('@supabase/supabase-js').__mock.rpc(...args),
  })),
}));

const supabaseMock = require('@supabase/supabase-js').__mock;

// Before each test, clear all mocks and set up the supabase mock
beforeEach(() => {
  jest.clearAllMocks();

  // Mock the supabase from and rpc methods
  supabaseMock.from.mockReturnValue({
    select: jest.fn((query) => ({
      eq: jest.fn(() => {
        if (query.includes('amount_votes')) {
          return Promise.resolve({
            data: [
              { user_id: 'u1', turn_order: 0, amount_votes: 2, Imposter: true },
              { user_id: 'u2', turn_order: 1, amount_votes: 1, Imposter: false },
              { user_id: 'me', turn_order: 2, amount_votes: 0, Imposter: false },
            ],
            error: null,
          });
        }

        // Mock the select query for the players table
        return Promise.resolve({
          data: [
            { user_id: 'u1', turn_order: 0, Imposter: false },
            { user_id: 'u2', turn_order: 1, Imposter: true },
            { user_id: 'me', turn_order: 2, Imposter: false },
          ],
          error: null,
        });
      }),
    })),
  });

  supabaseMock.rpc.mockResolvedValue({ error: null });
});

// Test that the vote options are loaded and rendered from Supabase
test('loads and renders vote options from Supabase', async () => {
  render(<Voting gameId="game-1" myId="me" onGameEnd={jest.fn()} />);

  expect(await screen.findByText('PLAYER 1')).toBeInTheDocument();
  expect(screen.getByText('PLAYER 2')).toBeInTheDocument();
});

// Test that the selected vote is submitted through the increment_vote RPC
test('submits selected vote through increment_vote RPC', async () => {
  render(<Voting gameId="game-1" myId="me" onGameEnd={jest.fn()} />);

  // Finds the confirm vote button and checks that it is disabled
  const confirmButton = await screen.findByRole('button', { name: 'CONFIRM VOTE' });
  expect(confirmButton).toBeDisabled();

  fireEvent.click(await screen.findByText('PLAYER 1'));
  expect(confirmButton).not.toBeDisabled();

  fireEvent.click(confirmButton);

  // Checks that the increment_vote RPC was called with the correct target_id
  await waitFor(() => {
    expect(supabaseMock.rpc).toHaveBeenCalledWith('increment_vote', { target_id: 'u1' });
  });

  expect(await screen.findByRole('button', { name: 'VOTE CONFIRMED' })).toBeInTheDocument();
});
