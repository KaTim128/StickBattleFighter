/**
 * Prop catalogue (Physics owns behaviour, Rendering owns looks). Every arena
 * prop is a kind from this list plus a placement. Material, mass and
 * durability are recorded now for Phase 7 (pickup, throw, break; REQ-PHY-5..10);
 * in Phase 4 props are static, and only `solid` kinds block movement.
 * Sizes are metres: w = width (left-right), d = depth (up-down the screen),
 * h = height (drawn rising up the screen).
 */
export type Material = 'wood' | 'metal' | 'glass' | 'plastic' | 'plant' | 'paper' | 'fabric' | 'stone' | 'ceramic';

/**
 * How much of a blow's damage a material actually takes (owner, 11/11/2026: "make metal objects
 * harder to break"). Metal shrugs off most of it; everything else takes it in full.
 */
export const MATERIAL_TOUGHNESS: Readonly<Record<Material, number>> = {
  metal: 0.45,
  stone: 0.6,
  wood: 1,
  glass: 1,
  plastic: 1,
  plant: 1,
  paper: 1,
  fabric: 1,
  ceramic: 1,
};

export interface PropKind {
  readonly label: string;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  /** Blocks fighters (has a collider). */
  readonly solid: boolean;
  readonly material: Material;
  readonly massKg: number;
  /** Hit points before breaking; null = cannot be destroyed (REQ-PHY-6). */
  readonly durability: number | null;
  /** Can be pushed or moved in Phase 7. */
  readonly movable: boolean;
  /** Can be picked up and thrown in Phase 7 (REQ-PHY-9). */
  readonly throwable: boolean;
  /** Flat floor decoration (rugs): drawn under everything, never blocks. */
  readonly decal?: boolean;
  /**
   * Has a firm, flat top a fighter can jump onto, or grab and climb when it is too high
   * (owner, 12/11/2026). Chairs, plants, bins and thin panels are not climbable.
   */
  readonly climbable?: boolean;
}

export const PROP_KINDS = {
  pillar: {
    climbable: true,
    label: 'Pillar',
    w: 0.9,
    d: 0.64,
    h: 2,
    solid: true,
    material: 'stone',
    massKg: 2000,
    durability: null,
    movable: false,
    throwable: false,
  },
  desk: {
    climbable: true,
    label: 'Desk',
    w: 1.6,
    d: 0.8,
    h: 0.75,
    solid: true,
    material: 'wood',
    massKg: 35,
    durability: 320, // owner 11/11/2026: tables are tough (was 120)
    movable: true,
    throwable: false,
  },
  'meeting-table': {
    climbable: true,
    label: 'Meeting table',
    w: 4,
    d: 1.6,
    h: 0.75,
    solid: true,
    material: 'wood',
    massKg: 90,
    durability: 200,
    movable: false,
    throwable: false,
  },
  'office-chair': {
    label: 'Office chair',
    w: 0.55,
    d: 0.55,
    h: 1,
    solid: true,
    material: 'fabric',
    massKg: 12,
    durability: 60,
    movable: true,
    throwable: true,
  },
  computer: {
    label: 'Computer monitor',
    w: 0.55,
    d: 0.2,
    h: 0.45,
    solid: false,
    material: 'glass', // the screen shatters
    massKg: 5,
    durability: 20,
    movable: true,
    throwable: true,
  },
  keyboard: {
    label: 'Keyboard',
    w: 0.45,
    d: 0.15,
    h: 0.03,
    solid: false,
    material: 'plastic',
    massKg: 0.8,
    durability: 10,
    movable: true,
    throwable: true,
  },
  mouse: {
    label: 'Mouse',
    w: 0.07,
    d: 0.11,
    h: 0.04,
    solid: false,
    material: 'plastic',
    massKg: 0.1,
    durability: 5,
    movable: true,
    throwable: true,
  },
  'coffee-cup': {
    label: 'Coffee cup',
    w: 0.09,
    d: 0.09,
    h: 0.11,
    solid: false,
    material: 'ceramic',
    massKg: 0.3,
    durability: 3,
    movable: true,
    throwable: true,
  },
  cabinet: {
    climbable: true,
    label: 'Filing cabinet',
    w: 0.9,
    d: 0.6,
    h: 1.3,
    solid: true,
    material: 'metal',
    massKg: 60,
    durability: 450, // steel: very tough, but breakable (owner 11/11/2026)
    movable: true,
    throwable: false,
  },
  'drawer-unit': {
    climbable: true,
    label: 'Steel drawer pedestal',
    w: 0.4,
    d: 0.55,
    h: 0.65,
    solid: true,
    material: 'metal',
    massKg: 45,
    durability: 260,
    movable: true,
    throwable: false,
  },
  'glass-partition': {
    label: 'Glass partition',
    w: 2,
    d: 0.1,
    h: 1.6,
    solid: true,
    material: 'glass',
    massKg: 40,
    durability: 30,
    movable: false,
    throwable: false,
  },
  plant: {
    label: 'Potted plant',
    w: 0.6,
    d: 0.6,
    h: 1.2,
    solid: true,
    material: 'plant',
    massKg: 15,
    durability: 25,
    movable: true,
    throwable: false,
  },
  'water-dispenser': {
    label: 'Water dispenser',
    w: 0.4,
    d: 0.4,
    h: 1.3,
    solid: true,
    material: 'plastic',
    massKg: 25,
    durability: 40,
    movable: true,
    throwable: false,
  },
  bin: {
    label: 'Rubbish bin',
    w: 0.4,
    d: 0.4,
    h: 0.5,
    solid: true,
    material: 'plastic',
    massKg: 2,
    durability: 15,
    movable: true,
    throwable: true,
  },
  printer: {
    climbable: true,
    label: 'Printer',
    w: 0.8,
    d: 0.6,
    h: 1.1,
    solid: true,
    material: 'plastic',
    massKg: 40,
    durability: 60,
    movable: true,
    throwable: false,
  },
  'cubicle-panel': {
    label: 'Cubicle wall',
    w: 2.4,
    d: 0.08,
    h: 1.3,
    solid: true,
    material: 'fabric',
    massKg: 18,
    durability: 50,
    movable: false,
    throwable: false,
  },
  'executive-desk': {
    climbable: true,
    label: 'Executive desk',
    w: 2.4,
    d: 1.1,
    h: 0.8,
    solid: true,
    material: 'wood',
    massKg: 120,
    durability: 450,
    movable: false,
    throwable: false,
  },
  'boss-chair': {
    label: 'Boss chair',
    w: 0.75,
    d: 0.75,
    h: 1.3,
    solid: true,
    material: 'fabric',
    massKg: 25,
    durability: 80,
    movable: true,
    throwable: false,
  },
  'visitor-chair': {
    label: 'Visitor chair',
    w: 0.6,
    d: 0.6,
    h: 0.95,
    solid: true,
    material: 'wood',
    massKg: 9,
    durability: 50,
    movable: true,
    throwable: true,
  },
  bookshelf: {
    climbable: true,
    label: 'Bookshelf',
    w: 2,
    d: 0.45,
    h: 2,
    solid: true,
    material: 'wood',
    massKg: 80,
    durability: 150,
    movable: false,
    throwable: false,
  },
  rug: {
    label: 'Rug',
    w: 4,
    d: 3,
    h: 0.01,
    solid: false,
    material: 'fabric',
    massKg: 10,
    durability: null,
    movable: false,
    throwable: false,
    decal: true,
  },
  // ---- Office fill-in (owner, 11/11/2026: "shelves, coffee machine, printer, a calling room, a food
  // shelf, file cabinets… fill in the empty spaces"). All original greybox designs.
  'kitchen-counter': {
    climbable: true,
    label: 'Kitchen counter',
    w: 2.4,
    d: 0.6,
    h: 0.9,
    solid: true,
    material: 'wood',
    massKg: 120,
    durability: 300,
    movable: false,
    throwable: false,
  },
  'coffee-machine': {
    label: 'Coffee machine',
    w: 0.38,
    d: 0.34,
    h: 0.45,
    solid: false,
    material: 'metal',
    massKg: 8,
    durability: 40,
    movable: true,
    throwable: true,
  },
  microwave: {
    label: 'Microwave',
    w: 0.5,
    d: 0.36,
    h: 0.3,
    solid: false,
    material: 'glass', // the door window shatters
    massKg: 12,
    durability: 45,
    movable: true,
    throwable: true,
  },
  'snack-shelf': {
    climbable: true,
    label: 'Snack shelf',
    w: 1.2,
    d: 0.45,
    h: 1.8,
    solid: true,
    material: 'metal',
    massKg: 45,
    durability: 150,
    movable: true,
    throwable: false,
  },
  'vending-machine': {
    climbable: true,
    label: 'Vending machine',
    w: 0.9,
    d: 0.75,
    h: 1.9,
    solid: true,
    material: 'glass',
    massKg: 250,
    durability: 260,
    movable: false,
    throwable: false,
  },
  'phone-booth': {
    climbable: true,
    label: 'Phone booth',
    w: 1.1,
    d: 1.0,
    h: 2.1,
    solid: true,
    material: 'glass',
    massKg: 300,
    durability: 220,
    movable: false,
    throwable: false,
  },
  // ---- Phase 7 throwables (REQ-PHY-9): small things on desks, and extinguishers by the walls.
  book: {
    label: 'Book',
    w: 0.22,
    d: 0.16,
    h: 0.05,
    solid: false,
    material: 'paper',
    massKg: 0.8,
    durability: 8,
    movable: true,
    throwable: true,
  },
  stapler: {
    label: 'Stapler',
    w: 0.16,
    d: 0.05,
    h: 0.06,
    solid: false,
    material: 'metal',
    massKg: 0.4,
    durability: 15,
    movable: true,
    throwable: true,
  },
  'water-bottle': {
    label: 'Water bottle',
    w: 0.08,
    d: 0.08,
    h: 0.24,
    solid: false,
    material: 'plastic',
    massKg: 0.6,
    durability: 6,
    movable: true,
    throwable: true,
  },
  'paper-stack': {
    label: 'Paper stack',
    w: 0.3,
    d: 0.22,
    h: 0.1,
    solid: false,
    material: 'paper',
    massKg: 1.5,
    durability: 10,
    movable: true,
    throwable: true,
  },
  'fire-extinguisher': {
    label: 'Fire extinguisher',
    w: 0.22,
    d: 0.22,
    h: 0.55,
    solid: true,
    material: 'metal',
    massKg: 9,
    durability: 40,
    movable: true,
    throwable: true,
  },
  sofa: {
    climbable: true,
    label: 'Sofa',
    w: 2,
    d: 0.85,
    h: 0.8,
    solid: true,
    material: 'fabric',
    massKg: 50,
    durability: 160,
    movable: true,
    throwable: false,
  },
} as const satisfies Record<string, PropKind>;

export type PropKindId = keyof typeof PROP_KINDS;

/** One prop in an arena. Position = centre of its footprint on the floor. */
export interface PropPlacement {
  readonly kind: PropKindId;
  readonly x: number;
  readonly y: number;
  /** Rotate the footprint 90° (swap width and depth). */
  readonly rotated?: boolean;
  /**
   * Which way its front faces (owner, 11/11/2026: furniture against a wall faces into the room,
   * chairs face their desk): n = up the map, s = down, e = right, w = left. Default: s for pieces
   * wider than deep, e otherwise; chairs default to s.
   */
  readonly facing?: 'n' | 's' | 'e' | 'w';
  /** Override width (e.g. long glass partitions or table runs). */
  readonly w?: number;
  /** Height above the floor it sits at (e.g. 0.75 for items on a desk). */
  readonly elevationM?: number;
  /** Depth-sort position (y) when it sits on another prop, so it draws on top of it. */
  readonly sortY?: number;
}

/** Footprint size of a placed prop, after rotation and overrides. */
export function footprint(p: PropPlacement): { w: number; d: number; h: number } {
  const kind = PROP_KINDS[p.kind];
  const w = p.w ?? kind.w;
  return p.rotated ? { w: kind.d, d: w, h: kind.h } : { w, d: kind.d, h: kind.h };
}

/** The catalogue entry for a kind, as the general PropKind type (for optional fields like `decal`). */
export function kindOf(id: PropKindId): PropKind {
  return PROP_KINDS[id];
}
