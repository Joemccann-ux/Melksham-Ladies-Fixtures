const puppeteer = require('puppeteer-core');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function captureFixtures() {
  console.log('Launching browser to capture screenshot...');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1200,1600'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 }); // High DPI for sharp text
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log('Navigating to FA Full-Time...');
    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the table or main container to render
    await page.waitForSelector('table, .fixture-single, body', { timeout: 15000 });

    // Hide unwanted headers, ads, or footers before taking screenshot
    await page.evaluate(() => {
      const selectorsToHide = ['header', 'footer', '.ad-banner', '#cookie-banner', '.nav-container'];
      selectorsToHide.forEach(s => {
        document.querySelectorAll(s).forEach(el => el.style.display = 'none');
      });
    });

    // Capture screenshot of the table element or entire viewport fallback
    const tableElement = await page.$('table') || await page.$('.fixture-single');

    if (tableElement) {
      await tableElement.screenshot({ path: 'fixtures.png' });
      console.log('Successfully captured table screenshot to fixtures.png');
    } else {
      await page.screenshot({ path: 'fixtures.png', fullPage: false });
      console.log('Captured viewport screenshot to fixtures.png');
    }

  } catch (err) {
    console.error('Screenshot capture failed:', err.message);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
}

captureFixtures();
