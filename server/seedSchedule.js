const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Game = require('./models/Game');

// Load environment variables for the database connection
dotenv.config();

const SEASON_YEAR = 2026;
const TOTAL_WEEKS = 18;

// Helper to map ESPN's proprietary game status to our custom schema
const mapStatus = (espnState) => {
  if (espnState === 'pre') return 'scheduled';
  if (espnState === 'in') return 'in_progress';
  if (espnState === 'post') return 'final';
  return 'scheduled';
};

const seedSchedule = async () => {
  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB.');

    // 2. Clear out existing schedule data to prevent accidental duplicates
    await Game.deleteMany({});
    console.log('Cleared existing schedule data.');

    let totalGamesAdded = 0;

    // 3. Loop through the 18-week schedule
    for (let week = 1; week <= TOTAL_WEEKS; week++) {
      
      // Fetch the specific week's regular-season matchups
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON_YEAR}&seasontype=2&week=${week}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.events || data.events.length === 0) {
        console.log(`No games found for Week ${week}. Skipping...`);
        continue;
      }

      // 4. Iterate over each game in the week and format the data
      for (const event of data.events) {
        const competition = event.competitions[0];
        
        // Separate the home and away competitors
        const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
        const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

        const game = new Game({
          gameId: event.id,
          week: week,
          homeTeam: homeCompetitor.team.name,
          awayTeam: awayCompetitor.team.name,
          kickoffTime: new Date(event.date), // Normalizes to UTC timestamp
          status: mapStatus(event.status.type.state)
        });

        await game.save();
        totalGamesAdded++;
      }
      
      console.log(`✅ Seeded Week ${week} successfully.`);
    }

    console.log(`\n🏈 TOUCHDOWN! Seeded exactly ${totalGamesAdded} games into your database.`);
    process.exit(0); // Safely close the script
  } catch (error) {
    console.error('❌ Failed to seed the database:', error);
    process.exit(1);
  }
};

// Execute the engine
seedSchedule();