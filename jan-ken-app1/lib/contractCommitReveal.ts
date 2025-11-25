/**
 * JankenCommitReveal Contract ABI and Address
 * Contract for commit-reveal Rock-Paper-Scissors game
 */

export const CONTRACT_ADDRESS_COMMIT_REVEAL = 
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_COMMIT_REVEAL || '0xb36b83A3a8367e3A9A336a9004993F0BD6278818';

export const CONTRACT_ABI_COMMIT_REVEAL = [
  // Match Creation
  {
    inputs: [{ internalType: 'uint256', name: 'betAmount', type: 'uint256' }],
    name: 'createMatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'joinMatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // Commit Phase
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'bytes32', name: 'commitHash', type: 'bytes32' },
    ],
    name: 'commitMove',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Reveal Phase
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'uint8', name: 'move', type: 'uint8' },
      { internalType: 'bytes32', name: 'secret', type: 'bytes32' },
    ],
    name: 'revealMove',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // View Functions
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'getMatch',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'player1', type: 'address' },
          { internalType: 'address', name: 'player2', type: 'address' },
          { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
          { internalType: 'bytes32', name: 'commit1', type: 'bytes32' },
          { internalType: 'bytes32', name: 'commit2', type: 'bytes32' },
          { internalType: 'uint8', name: 'move1', type: 'uint8' },
          { internalType: 'uint8', name: 'move2', type: 'uint8' },
          { internalType: 'bytes32', name: 'secret1', type: 'bytes32' },
          { internalType: 'bytes32', name: 'secret2', type: 'bytes32' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'address', name: 'winner', type: 'address' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'uint256', name: 'resolvedAt', type: 'uint256' },
        ],
        internalType: 'struct JankenCommitReveal.Match',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerMatches',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'move', type: 'uint8' },
      { internalType: 'bytes32', name: 'secret', type: 'bytes32' },
    ],
    name: 'computeCommitHash',
    outputs: [{ internalType: 'bytes32', name: 'commitHash', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  // Constants
  {
    inputs: [],
    name: 'FEE_BPS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_BET',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_BET',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'matches',
    outputs: [
      { internalType: 'address', name: 'player1', type: 'address' },
      { internalType: 'address', name: 'player2', type: 'address' },
      { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
      { internalType: 'bytes32', name: 'commit1', type: 'bytes32' },
      { internalType: 'bytes32', name: 'commit2', type: 'bytes32' },
      { internalType: 'uint8', name: 'move1', type: 'uint8' },
      { internalType: 'uint8', name: 'move2', type: 'uint8' },
      { internalType: 'bytes32', name: 'secret1', type: 'bytes32' },
      { internalType: 'bytes32', name: 'secret2', type: 'bytes32' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'uint256', name: 'resolvedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'player1', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'betAmount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'MatchCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'player2', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'PlayerJoined',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'commitHash', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'MoveCommitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'move', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'MoveRevealed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'prize', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'move1', type: 'uint8' },
      { indexed: false, internalType: 'uint8', name: 'move2', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'MatchResolved',
    type: 'event',
  },
] as const;

// Move enum values
export const MOVE = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
} as const;

// Match status enum values
export const MATCH_STATUS = {
  WAITING: 0,
  COMMITTED: 1,
  REVEALED: 2,
  RESOLVED: 3,
  CANCELLED: 4,
} as const;

