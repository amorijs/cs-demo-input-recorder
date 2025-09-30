/**
 * Converts CS2 player numbers to the bitmask value for tv_listen_voice_indices
 * 
 * In CS2 demos, players are assigned numbers 4-13. The tv_listen_voice_indices
 * command uses a bitmask system where each player slot corresponds to a bit position.
 * The mapping is: playerNumber - 1 = bitPosition
 * 
 * @param playerNumbers Array of player numbers (4-13 in CS2)
 * @returns Decimal value to use with tv_listen_voice_indices command
 * 
 * @example
 * // To listen to players 4, 6, 8, 9, and 11:
 * const voiceIndex = calculateVoiceIndices([4, 6, 8, 9, 11]);
 * console.log(voiceIndex); // 1448
 * // Use in CS2: tv_listen_voice_indices 1448
 */
export const calculateVoiceIndices = (playerNumbers: number[]): number => {
  let bitmask = 0;

  for (const playerNum of playerNumbers) {
    if (playerNum < 4 || playerNum > 13) {
      throw new Error(`Invalid player number: ${playerNum}. Must be between 4-13`);
    }

    // Convert player number to bit position (player N = bit N-1)
    const bitPosition = playerNum - 1;

    // Set the corresponding bit using bitwise OR
    bitmask |= (1 << bitPosition);
  }

  return bitmask;
};

/**
 * Helper function to visualize the binary representation
 * Useful for debugging and understanding the bitmask
 * 
 * @param playerNumbers Array of player numbers (4-13 in CS2)
 * @returns Object with binary string, decimal value, and player mapping
 */
export const visualizeVoiceIndices = (playerNumbers: number[]) => {
  const decimal = calculateVoiceIndices(playerNumbers);
  const binary = decimal.toString(2).padStart(32, '0');

  // Format binary in groups of 8 for readability
  const formattedBinary = binary.match(/.{1,8}/g)?.join(' ') || binary;

  // Show which bit positions are set
  const bitPositions = playerNumbers.map(p => p - 1).sort((a, b) => a - b);

  return {
    playerNumbers: [...playerNumbers].sort((a, b) => a - b),
    bitPositions,
    binary: formattedBinary,
    hex: `0x${decimal.toString(16).toUpperCase().padStart(8, '0')}`,
    decimal,
    command: `tv_listen_voice_indices ${decimal}`
  };
};