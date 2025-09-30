const KEY_MAPPING = {
  IN_ATTACK: 1 << 0,
  IN_JUMP: 1 << 1,
  IN_DUCK: 1 << 2,
  IN_FORWARD: 1 << 3,
  IN_BACK: 1 << 4,
  IN_USE: 1 << 5,
  IN_CANCEL: 1 << 6,
  IN_TURNLEFT: 1 << 7,
  IN_TURNRIGHT: 1 << 8,
  IN_MOVELEFT: 1 << 9,
  IN_MOVERIGHT: 1 << 10,
  IN_ATTACK2: 1 << 11,
  IN_RELOAD: 1 << 13,
  IN_ALT1: 1 << 14,
  IN_ALT2: 1 << 15,
  IN_SPEED: 1 << 16,
  IN_WALK: 1 << 17,
  IN_ZOOM: 1 << 18,
  IN_WEAPON1: 1 << 19,
  IN_WEAPON2: 1 << 20,
  IN_BULLRUSH: 1 << 21,
  IN_GRENADE1: 1 << 22,
  IN_GRENADE2: 1 << 23,
  IN_ATTACK3: 1 << 24,
  // IN_SCORE: 1 << 33, // careful: >32 bits means BigInt in JS
  // IN_INSPECT: 1 << 35, // same here
};

export type ButtonName = keyof typeof KEY_MAPPING;

export const extractButtons = (buttons: number | string): ButtonName[] => {
  // Convert string -> number if coming from parser
  const sanitizedButtons: number =
    typeof buttons === "string" ? Number(buttons) : buttons;

  const pressed: ButtonName[] = [];

  for (const [name, bit] of Object.entries(KEY_MAPPING)) {
    if ((sanitizedButtons & bit) !== 0) {
      pressed.push(name as ButtonName);
    }
  }

  return pressed;
}
