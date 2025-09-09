/**
 * Club management system for golf game
 */

export const CLUB_TYPES = {
  DRIVER: 'driver',
  PUTTER: 'putter',
  WEDGE: 'wedge'
};

export const CLUB_PROPERTIES = {
  [CLUB_TYPES.DRIVER]: {
    name: 'Driver',
    power: 1.07, // Reduced by 1/3 (1.6 * 2/3 = 1.07)
    launchAngle: -800, // Reduced by 1/3 (1200 * 2/3 = 800)
    horizontalPower: 467, // Reduced by 1/3 (700 * 2/3 = 467)
    canFly: true,
    description: 'Long distance shots'
  },
  [CLUB_TYPES.PUTTER]: {
    name: 'Putter',
    power: 0.8, // Reduced by 1/3 (1.2 * 2/3 = 0.8)
    launchAngle: 0, // No upward velocity - stays on ground
    horizontalPower: 200, // Reduced by 1/3 (300 * 2/3 = 200)
    canFly: false,
    description: 'Precise ground shots'
  },
  [CLUB_TYPES.WEDGE]: {
    name: 'Wedge',
    power: 0.9, // Increased by 1.5x (0.6 * 1.5 = 0.9)
    launchAngle: -2700, // Increased by 1.5x (1800 * 1.5 = 2700)
    horizontalPower: 225, // Increased by 1.5x (150 * 1.5 = 225)
    canFly: true,
    description: 'High arc, medium distance shots'
  }
};

export class ClubManager {
  constructor() {
    this.currentClub = CLUB_TYPES.DRIVER;
    this.clubs = Object.keys(CLUB_TYPES);
    this.currentIndex = 0;
  }

  // Get current club type
  getCurrentClub() {
    return this.currentClub;
  }

  // Get current club properties
  getCurrentClubProperties() {
    return CLUB_PROPERTIES[this.currentClub];
  }

  // Switch to specific club
  selectClub(clubType) {
    if (CLUB_PROPERTIES[clubType]) {
      this.currentClub = clubType;
      this.currentIndex = this.clubs.indexOf(clubType);
      return true;
    }
    return false;
  }

  // Switch to driver
  selectDriver() {
    return this.selectClub(CLUB_TYPES.DRIVER);
  }

  // Switch to putter
  selectPutter() {
    return this.selectClub(CLUB_TYPES.PUTTER);
  }

  // Switch to wedge
  selectWedge() {
    return this.selectClub(CLUB_TYPES.WEDGE);
  }

  // Cycle through clubs
  nextClub() {
    this.currentIndex = (this.currentIndex + 1) % this.clubs.length;
    this.currentClub = this.clubs[this.currentIndex];
    return this.currentClub;
  }

  // Get club info for display
  getClubInfo() {
    const props = this.getCurrentClubProperties();
    return {
      name: props.name,
      description: props.description,
      type: this.currentClub
    };
  }
}
