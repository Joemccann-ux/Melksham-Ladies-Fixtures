const fs = require('fs');
const puppeteer = require('puppeteer-core');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  console.log('Launching browser...');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    await page.goto(FA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const fixtures = await page.evaluate(() => {
      const list = [];
      let currentDate = '';

      const rows = document.querySelectorAll('tr, .fixture-single');

      rows.forEach(row => {
        const text = row.innerText ? row.innerText.trim() : '';

        if (/Sunday|Saturday|Monday|Tuesday|Wednesday|Thursday|Friday/i.test(text) && text.length < 40) {
          currentDate = text.replace(/\n/g, ' ');
        }

        if (text.toLowerCase().includes('melksham') || text.includes(' VS ') || /\d{1,2}:\d{2}/.test(text)) {
          const parts = text.split('\n').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            list.push({
              date: currentDate || 'Upcoming',
              homeTeam: parts[0],
              awayTeam: parts[1] || 'TBD',
              scoreOrTime: parts.find(p => /\d{1,2}:\d{2}/.test(p) || p.includes('-')) || '14:00',
              venue: parts.find(p => /stadium|ground|park|field|road|lane/i.test(p)) || ''
            });
          }
        }
      });

      return list;
    });

    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));
    console.log(`Saved ${fixtures.length} fixtures.`);

  } catch (err) {
    console.error('Error during scraping:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0); // Explicitly terminate the Node process
  }
}

scrapeFixtures();
