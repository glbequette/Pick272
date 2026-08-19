const cron = require('node-cron');
const Game = require('../models/Game');
const PickSheet = require('../models/PickSheet');

const SEASON_YEAR = 2026;

const runAutoUpdater = () => {
  console.log('🏈 Auto-Score Updater initialized. Running every 15 minutes.');

  // Schedule the task to run every 15 minutes: '*/15 * * * *'
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 Checking ESPN for completed games...');
    try {
      // 1. Check which week is currently active based on scheduled games
      const upcomingGame = await Game.findOne({ status: { $in: ['scheduled', 'in_progress'] } }).sort({ kickoffTime: 1 });
      const currentWeek = upcomingGame ? upcomingGame.week : 18;

      // 2. Fetch the live scoreboard from ESPN for the current week
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${SEASON_YEAR}&seasontype=2&week=${currentWeek}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.events) return;

      for (const event of data.events) {
        // We only care about games that have officially finished ('post')
        if (event.status.type.state === 'post') {
          const gameId = event.id;
          const homeCompetitor = event.competitions[0].competitors.find(c => c.homeAway === 'home');
          const awayCompetitor = event.competitions[0].competitors.find(c => c.homeAway === 'away');
          
          const homeScore = parseInt(homeCompetitor.score);
          const awayScore = parseInt(awayCompetitor.score);
          
          let winner = 'tie';
          if (homeScore > awayScore) winner = homeCompetitor.team.name;
          if (awayScore > homeScore) winner = awayCompetitor.team.name;

          // 3. Update the Game document if it hasn't been marked final yet
          const game = await Game.findOne({ gameId, status: { $ne: 'final' } });
          
          if (game) {
            game.homeScore = homeScore;
            game.awayScore = awayScore;
            game.winner = winner;
            game.status = 'final';
            await game.save();

            console.log(`✅ Final Score Recorded: ${game.awayTeam} ${awayScore} - ${game.homeScore} ${game.homeTeam}`);

            // 4. Grade the picks! Update all PickSheets that picked this game
            const affectedSheets = await PickSheet.find({ "picks.gameId": gameId });
            
            for (const sheet of affectedSheets) {
              let pointsChanged = false;

              // Find the specific pick in the user's array
              const pickIndex = sheet.picks.findIndex(p => p.gameId === gameId);
              
              if (pickIndex !== -1 && sheet.picks[pickIndex].status === 'pending') {
                const selectedTeam = sheet.picks[pickIndex].selectedTeam;
                
                if (winner === 'tie') {
                  sheet.picks[pickIndex].status = 'tie';
                  pointsChanged = true; // NEW: Tell the system a point-scoring event happened
                } else if (selectedTeam === winner) {
                  sheet.picks[pickIndex].status = 'won';
                  pointsChanged = true;
                } else {
                  sheet.picks[pickIndex].status = 'lost';
                }

                // If they won or tied, recalculate their total points
                if (pointsChanged) {
                  sheet.totalPoints = sheet.picks.reduce((total, p) => {
                    // NEW: Count both 'won' and 'tie' statuses towards their total score
                    return (p.status === 'won' || p.status === 'tie') ? total + (p.pointsValue || 1) : total;
                  }, 0);
                }
                
                await sheet.save();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error during automated score update:', error);
    }
  });
};

module.exports = runAutoUpdater;