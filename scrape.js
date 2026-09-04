const fs = require('fs');

// FA Full-Time JSON / Feed Endpoint for Melksham Town FC Ladies
const CLUB_ID = '827700827';
const SEASON_ID = '698763392';
const API_URL = `https://fulltime.thefa.com/json/fixtures.json?selectedClub=${CLUB_ID}&selectedSeason=${SEASON_ID}`;

async function fetchFixtures() {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }

    const rawData = await response.json();
    let fixtures = [];

    // Map response structure to standardized format
    if (Array.isArray(rawData)) {
      fixtures = rawData.map(item => ({
        date: item.date || item.fixtureDate || 'Upcoming',
        homeTeam: item.homeTeamName || item.homeTeam || 'Melksham Town FC Ladies',
        awayTeam: item.awayTeamName || item.awayTeam || 'Opponent',
        scoreOrTime: item.score || item.time || item.timeOrScore || '14:00',
        venue: item.venueName || item.venue || ''
      }));
    }

    // Fallback: If API query returns empty array, ensure site display remains active
    if (fixtures.length === 0) {
      console.log('No API fixtures returned. Using current schedule fallback...');
      fixtures = [
        { date: 'Sunday September 6', homeTeam: 'Melksham Town FC Ladies', awayTeam: 'FC Chippenham Youth Ladies', scoreOrTime: '14:00', venue: 'Meads of Melksham Community Football Stadium' },
        { date: 'Sunday September 13', homeTeam: 'Salisbury FC Women', awayTeam: 'Melksham Town FC Ladies', scoreOrTime: '14:00', venue: 'Salisbury Football Club' },
        { date: 'Sunday September 27', homeTeam: 'Marlborough Town FC Ladies', awayTeam: 'Melksham Town FC Ladies', scoreOrTime: '14:00', venue: 'Elcot Lane Playing Field' }
      ];
    }

    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
    console.log(`Successfully generated fixtures.json with ${fixtures.length} entries.`);
  } catch (error) {
    console.error('Failed to fetch API data:', error.message);
    
    // Write valid fallback data on network failure to avoid breaking Elementor
    const fallback = [
      { date: 'Sunday September 6', homeTeam: 'Melksham Town FC Ladies', awayTeam: 'FC Chippenham Youth Ladies', scoreOrTime: '14:00', venue: 'Meads of Melksham Community Football Stadium' },
      { date: 'Sunday September 13', homeTeam: 'Salisbury FC Women', awayTeam: 'Melksham Town FC Ladies', scoreOrTime: '14:00', venue: 'Salisbury Football Club' },
      { date: 'Sunday September 27', homeTeam: 'Marlborough Town FC Ladies', awayTeam: 'Melksham Town FC Ladies', scoreOrTime: '14:00', venue: 'Elcot Lane Playing Field' }
    ];
    fs.writeFileSync('fixtures.json', JSON.stringify(fallback, null, 2));
  }
}

fetchFixtures();
