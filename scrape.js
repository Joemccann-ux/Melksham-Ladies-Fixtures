const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  try {
    const { data } = await axios.get(FA_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(data);
    const fixtures = [];

    $('.fixture-single').each((_, el) => {
      const date = $(el).find('.fixture-date').text().trim();
      const homeTeam = $(el).find('.home-team').text().trim();
      const awayTeam = $(el).find('.away-team').text().trim();
      const scoreOrTime = $(el).find('.score-or-time').text().trim();
      const venue = $(el).find('.venue-col').text().trim();

      if (homeTeam && awayTeam) {
        fixtures.push({ date, homeTeam, awayTeam, scoreOrTime, venue });
      }
    });

    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
    console.log(`Successfully saved ${fixtures.length} fixtures.`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

scrapeFixtures();
