const fs = require('fs');
const puppeteer = require('puppeteer-core');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function processFAFixtures() {
  console.log('Launching browser...');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 2500, deviceScaleFactor: 2 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('Navigating to FA Page...');
    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1. Dismiss Cookie Banner automatically if present
    try {
      const rejectBtn = await page.$('#onetrust-reject-all-handler') || await page.$('button:has-text("Reject All")');
      if (rejectBtn) {
        await rejectBtn.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.log('No cookie banner blocking interaction.');
    }

    // 2. Extract Data directly from the live rendered table
    const fixtures = await page.evaluate(() => {
      const list = [];
      const rows = Array.from(document.querySelectorAll('tr'));

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim());

        // Target match rows (Type, Date/Time, Home, Away, Venue, Competition, Status)
        if (cells.length >= 5) {
          const dateTimeRaw = cells[1] || '';
          const home = cells[2] || '';
          const away = cells[3] || '';
          const venue = cells[4] || '';

          if (home && away && (home.includes('FC') || away.includes('FC') || home.includes('Ladies') || away.includes('Ladies'))) {
            const dateParts = dateTimeRaw.split('\n');
            list.push({
              date: dateParts[0] || dateTimeRaw,
              homeTeam: home.replace(/\n/g, ' '),
              awayTeam: away.replace(/\n/g, ' '),
              scoreOrTime: dateParts[1] || '14:00',
              venue: venue.replace(/\n/g, ' ')
            });
          }
        }
      });

      return list;
    });

    console.log(`Extracted ${fixtures.length} live matches directly from DOM.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

    // 3. Take clean screenshot of full match table as a fallback artifact
    const tableContainer = await page.$('.fixture-single') || await page.$('table') || await page.$('body');
    if (tableContainer) {
      await tableContainer.screenshot({ path: 'fixtures.png' });
    }

  } catch (err) {
    console.error('Execution error:', err.message);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
}

processFAFixtures();
