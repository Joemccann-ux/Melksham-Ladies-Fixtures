const fs = require('fs');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  try {
    const response = await fetch(FA_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();
    const fixtures = [];
    const clean = (str) => str ? str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

    // Split rows out of the FA Full-Time HTML table structure
    const rows = html.split(/<tr[^>]*>/i);
    let currentDate = '';

    for (const row of rows) {
      // Capture date header rows
      if (row.includes('class="date"') || row.includes('date-row') || row.includes('header-date')) {
        const dateMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i) || row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
        if (dateMatch) currentDate = clean(dateMatch[1]);
      }

      // Capture fixture content rows
      if (row.includes('home-team') || row.includes('away-team') || row.includes('fixture')) {
        const cells = row.split(/<td[^>]*>/i).slice(1);
        
        if (cells.length >= 2) {
          const rowText = cells.map(c => clean(c.split('</td>')[0]));
          
          // Match team names from row text
          const homeTeam = rowText.find(t => t.toLowerCase().includes('melksham') || t.length > 3) || '';
          const awayTeam = rowText.slice().reverse().find(t => t.length > 3 && t !== homeTeam) || '';
          
          const scoreOrTime = rowText.find(t => /\b\d{1,2}:\d{2}\b|\b\d+\s*-\s*\d+\b/i.test(t)) || 'VS';
          const venue = rowText.find(t => t.toLowerCase().includes('stadium') || t.toLowerCase().includes('park') || t.toLowerCase().includes('field') || t.toLowerCase().includes('road') || t.toLowerCase().includes('ground')) || '';

          if (homeTeam && awayTeam && homeTeam !== awayTeam) {
            fixtures.push({
              date: currentDate || 'Upcoming',
              homeTeam,
              awayTeam,
              scoreOrTime,
              venue
            });
          }
        }
      }
    }

    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
    console.log(`Saved ${fixtures.length} fixtures to fixtures.json`);
  } catch (err) {
    console.error('Scraping error:', err.message);
    process.exit(1);
  }
}

scrapeFixtures();
