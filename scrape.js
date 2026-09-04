const fs = require('fs');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  try {
    const response = await fetch(FA_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await response.text();
    const fixtures = [];

    // Parse HTML blocks natively without heavy cheerio package
    const blocks = html.split('class="fixture-single"');
    blocks.shift(); // Remove content before first fixture

    for (const block of blocks) {
      const dateMatch = block.match(/class="fixture-date"[^>]*>([\s\S]*?)<\/span>/i);
      const homeMatch = block.match(/class="home-team"[^>]*>([\s\S]*?)<\/td>/i);
      const awayMatch = block.match(/class="away-team"[^>]*>([\s\S]*?)<\/td>/i);
      const statusMatch = block.match(/class="score-or-time"[^>]*>([\s\S]*?)<\/td>/i);
      const venueMatch = block.match(/class="venue-col"[^>]*>([\s\S]*?)<\/td>/i);

      const stripTags = (str) => str ? str.replace(/<[^>]*>/g, '').trim() : '';

      const homeTeam = stripTags(homeMatch ? homeMatch[1] : '');
      const awayTeam = stripTags(awayMatch ? awayMatch[1] : '');

      if (homeTeam && awayTeam) {
        fixtures.push({
          date: stripTags(dateMatch ? dateMatch[1] : ''),
          homeTeam,
          awayTeam,
          scoreOrTime: stripTags(statusMatch ? statusMatch[1] : ''),
          venue: stripTags(venueMatch ? venueMatch[1] : '')
        });
      }
    }

    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
    console.log(`Saved ${fixtures.length} fixtures to fixtures.json`);
  } catch (err) {
    console.error('Error fetching fixtures:', err.message);
    process.exit(1);
  }
}

scrapeFixtures();
