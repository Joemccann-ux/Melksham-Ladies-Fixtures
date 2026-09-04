const fs = require('fs');
const puppeteer = require('puppeteer');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set standard browser user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('Navigating to FA Full-Time...');
    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extract rendered DOM text
    const fixtures = await page.evaluate(() => {
      const results = [];
      let currentDate = '';

      // Target all table rows or fixture blocks
      const elements = document.querySelectorAll('tr, .fixture-single');

      elements.forEach(el => {
        const text = el.innerText ? el.innerText.trim() : '';

        // Capture Date headers
        if (el.classList.contains('date-row') || el.classList.contains('header-date') || /Sunday|Saturday|Monday|Tuesday|Wednesday|Thursday|Friday/i.test(text) && text.length < 35) {
          currentDate = text.replace(/\n/g, ' ');
        }

        // Capture Fixtures
        if (text.toLowerCase().includes('melksham') || text.includes(' VS ') || text.includes(':')) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length >= 2) {
            results.push({
              date: currentDate || 'Upcoming',
              homeTeam: lines[0] || 'Melksham Town FC Ladies',
              awayTeam: lines[1] || 'Opponent',
              scoreOrTime: lines.find(l => /\d{1,2}:\d{2}/.test(l) || l.includes('-')) || '14:00',
              venue: lines.find(l => l.toLowerCase().includes('stadium') || l.toLowerCase().includes('park') || l.toLowerCase().includes('field') || l.toLowerCase().includes('ground')) || 'Home/Away Venue'
            });
          }
        }
      });

      return results;
    });

    console.log(`Successfully scraped ${fixtures.length} fixtures.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

  } catch (err) {
    console.error('Scraping failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

scrapeFixtures();
