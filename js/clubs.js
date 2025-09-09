/**
 * Club management system for golf game
 */

export const CLUB_TYPES = {
  DRIVER: 'driver',
  IRON: 'iron',
  PUTTER: 'putter',
  WEDGE: 'wedge'
};

export const CLUB_PROPERTIES = {
  [CLUB_TYPES.DRIVER]: {
    name: 'Driver',
    power: 0.9, // Moderate increase for better distance without going overboard
    launchAngle: -900, // Slightly higher arc for good distance
    horizontalPower: 750, // Reasonable increase from original 650
    canFly: true,
    description: 'Long distance shots'
  },
  [CLUB_TYPES.IRON]: {
    name: 'Iron',
    power: 1.17, // Reduced by 5% from 1.23 (1.23 * 0.95 = 1.17)
    launchAngle: -1200, // Medium arc - higher than driver, lower than wedge
    horizontalPower: 646, // Reduced by 5% from 680 (680 * 0.95 = 646)
    canFly: true,
    description: 'Medium distance, accurate shots'
  },
  [CLUB_TYPES.PUTTER]: {
    name: 'Putter',
    power: 1.5, // Moderate power for gentle, precise putting
    launchAngle: 0, // No upward velocity - stays on ground
    horizontalPower: 500, // Moderate horizontal power for controlled distance
    canFly: false,
    description: 'Precise ground shots'
  },
  [CLUB_TYPES.WEDGE]: {
    name: 'Wedge',
    power: 1.2, // Increased for 30-40 yards more distance
    launchAngle: -2700, // Keep high arc characteristic
    horizontalPower: 320, // Increased significantly for more distance
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

  // Switch to iron
  selectIron() {
    return this.selectClub(CLUB_TYPES.IRON);
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
