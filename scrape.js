const fs = require('fs');
const puppeteer = require('puppeteer-core');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function scrapeFixtures() {
  console.log('Starting exact table scraper...');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Load page and wait explicitly for table rows to appear
    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('tr', { timeout: 15000 }).catch(() => console.log('Table rows loading...'));

    const fixtures = await page.evaluate(() => {
      const results = [];
      const rows = Array.from(document.querySelectorAll('tr'));

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());

        // Target valid table rows (must have date, home team, away team)
        if (cells.length >= 5) {
          const dateTimeRaw = cells[1] || ''; // e.g., "13/09/26\n14:00"
          const homeTeam = cells[2] || '';
          const awayTeam = cells[3] || '';
          const venue = cells[4] || '';

          // Validate row contains match info
          if (dateTimeRaw && homeTeam && awayTeam && (homeTeam.includes('FC') || awayTeam.includes('FC') || homeTeam.includes('Ladies') || awayTeam.includes('Ladies'))) {
            const dateParts = dateTimeRaw.split('\n');
            const dateStr = dateParts[0] || dateTimeRaw;
            const timeStr = dateParts[1] || '14:00';

            results.push({
              date: dateStr,
              homeTeam: homeTeam.replace(/\n/g, ' '),
              awayTeam: awayTeam.replace(/\n/g, ' '),
              scoreOrTime: timeStr,
              venue: venue.replace(/\n/g, ' ')
            });
          }
        }
      });

      return results;
    });

    console.log(`Successfully scraped ${fixtures.length} live matches directly from FA table.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

  } catch (err) {
    console.error('Scraping error:', err.message);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
}

scrapeFixtures();
