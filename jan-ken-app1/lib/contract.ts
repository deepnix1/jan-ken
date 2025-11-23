export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x877cb5a3BD613D764c0f4e61365A0B65A7f4F180';

export const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'betLevel', type: 'uint256' }],
    name: 'joinQueue',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'choice', type: 'uint8' }],
    name: 'makeChoice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'timeoutGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getMyGame',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'player1', type: 'address' },
          { internalType: 'address', name: 'player2', type: 'address' },
          { internalType: 'uint256', name: 'betAmount', type: 'uint256' },
          { internalType: 'uint8', name: 'player1Choice', type: 'uint8' },
          { internalType: 'uint8', name: 'player2Choice', type: 'uint8' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'address', name: 'winner', type: 'address' },
        ],
        internalType: 'struct RockPaperScissors.Game',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BET_LEVEL_1',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BET_LEVEL_2',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BET_LEVEL_3',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BET_LEVEL_4',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }, { internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'waitingPlayers',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

