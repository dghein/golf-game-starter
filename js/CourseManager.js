/**
 * CourseManager - Manages progression through 18-hole golf course
 */
export class CourseManager {
  constructor() {
    this.currentHole = 1;
    this.totalHoles = 18;
    this.scores = new Array(this.totalHoles).fill(0); // Store scores for each hole
    this.totalScore = 0;
    
    // Yardage for each hole (you can customize these)
    this.yardages = [
      580, // Hole 1 - Par 5 (>500 yards) - matches actual terrain layout (11600px ÷ 20px/yard = 580y)
      175, // Hole 2 - Par 3 - custom shorter hole with pin at 175 yards
      420, // Hole 3 - Par 4 (230-500 yards)
      350, // Hole 4 - Par 4
      160, // Hole 5 - Par 3
      480, // Hole 6 - Par 4
      540, // Hole 7 - Par 5
      200, // Hole 8 - Par 3
      380, // Hole 9 - Par 4
      450, // Hole 10 - Par 4
      170, // Hole 11 - Par 3
      580, // Hole 12 - Par 5
      320, // Hole 13 - Par 4
      190, // Hole 14 - Par 3
      410, // Hole 15 - Par 4
      560, // Hole 16 - Par 5
      150, // Hole 17 - Par 3
      440  // Hole 18 - Par 4
    ];
    
    // Calculate par based on yardage
    this.par = this.yardages.map(yardage => this.calculateParFromYardage(yardage));
  }
  
  // Calculate par based on yardage
  calculateParFromYardage(yardage) {
    if (yardage > 500) return 5;      // Par 5: > 500 yards
    if (yardage >= 230) return 4;     // Par 4: 230-500 yards
    return 3;                         // Par 3: < 230 yards
  }

  // Get current hole number
  getCurrentHole() {
    return this.currentHole;
  }

  // Get total holes
  getTotalHoles() {
    return this.totalHoles;
  }

  // Get par for current hole
  getCurrentPar() {
    return this.par[this.currentHole - 1];
  }

  // Get par for specific hole
  getParForHole(holeNumber) {
    return this.par[holeNumber - 1] || 4; // Default to par 4
  }

  // Get yardage for current hole
  getCurrentYardage() {
    return this.yardages[this.currentHole - 1];
  }

  // Get yardage for specific hole
  getYardageForHole(holeNumber) {
    return this.yardages[holeNumber - 1] || 400; // Default to 400 yards
  }

  // Record score for current hole
  recordScore(strokes) {
    console.log(`Recording score for Hole ${this.currentHole}: ${strokes} strokes (Par ${this.getCurrentPar()})`);
    this.scores[this.currentHole - 1] = strokes;
    this.calculateTotalScore();
    console.log(`Hole ${this.currentHole} completed in ${strokes} strokes (Par ${this.getCurrentPar()})`);
    console.log(`Current scores array:`, this.scores);
  }

  // Calculate total score
  calculateTotalScore() {
    this.totalScore = this.scores.reduce((total, score) => total + score, 0);
  }

  // Get score for specific hole
  getScoreForHole(holeNumber) {
    return this.scores[holeNumber - 1] || 0;
  }

  // Get total score
  getTotalScore() {
    return this.totalScore;
  }

  // Get score relative to par (only for completed holes)
  getScoreRelativeToPar() {
    let totalPar = 0;
    let completedScore = 0;
    
    // Only count completed holes
    for (let i = 0; i < this.totalHoles; i++) {
      if (this.scores[i] > 0) { // Hole has been completed
        totalPar += this.par[i];
        completedScore += this.scores[i];
        console.log(`Hole ${i + 1}: Par ${this.par[i]}, Score ${this.scores[i]}`);
      }
    }
    
    const scoreRelativeToPar = completedScore - totalPar;
    console.log(`Total Par: ${totalPar}, Total Score: ${completedScore}, Score to Par: ${scoreRelativeToPar}`);
    return scoreRelativeToPar;
  }

  // Check if course is complete
  isCourseComplete() {
    return this.currentHole > this.totalHoles;
  }

  // Advance to next hole
  nextHole() {
    if (this.currentHole < this.totalHoles) {
      this.currentHole++;
      console.log(`Advancing to Hole ${this.currentHole}`);
      return true;
    }
    return false; // Course complete
  }

  // Get scene name for current hole
  getCurrentSceneName() {
    return `Hole${this.currentHole}Scene`;
  }

  // Get scene name for specific hole
  getSceneNameForHole(holeNumber) {
    return `Hole${holeNumber}Scene`;
  }

  // Go to specific hole (for debugging/testing)
  gotoHole(holeNumber) {
    if (holeNumber >= 1 && holeNumber <= this.totalHoles) {
      this.currentHole = holeNumber;
      console.log(`Switched to Hole ${this.currentHole} - Par ${this.getCurrentPar()}, ${this.getCurrentYardage()} yards`);
      return true;
    } else {
      console.error(`Invalid hole number: ${holeNumber}. Must be between 1 and ${this.totalHoles}`);
      return false;
    }
  }

  // Reset course (for new game)
  reset() {
    this.currentHole = 1;
    this.scores = new Array(this.totalHoles).fill(0);
    this.totalScore = 0;
    console.log('Course reset for new game');
  }

  // Get scorecard summary
  getScorecard() {
    const scorecard = [];
    for (let i = 0; i < this.totalHoles; i++) {
      scorecard.push({
        hole: i + 1,
        par: this.par[i],
        score: this.scores[i] || 0,
        completed: this.scores[i] > 0
      });
    }
    return scorecard;
  }
}

// Global course manager instance
export const courseManager = new CourseManager();
