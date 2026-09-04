const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { createWorker } = require('tesseract.js');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function processFAFixtures() {
  console.log('Launching browser to capture screenshot...');
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

    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));

    // Hide unwanted elements to give OCR a clean image
    await page.evaluate(() => {
      const selectorsToHide = ['#onetrust-banner-sdk', 'header', 'footer', '.ad-banner'];
      selectorsToHide.forEach(s => {
        document.querySelectorAll(s).forEach(el => el.style.display = 'none');
      });
    });

    // 1. Save Image
    await page.screenshot({ path: 'fixtures.png', fullPage: true });
    console.log('Saved fixtures.png');

    await browser.close();

    // 2. Perform OCR on fixtures.png to extract text
    console.log('Starting OCR text extraction from fixtures.png...');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize('fixtures.png');
    await worker.terminate();

    // 3. Convert raw OCR text into structured JSON
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const fixtures = [];

    lines.forEach(line => {
      // Match rows with date format like 13/09/26 or 27/09/26
      if (/\d{2}\/\d{2}\/\d{2}/.test(line) && /VS|Vs|vs/.test(line)) {
        const dateMatch = line.match(/\d{2}\/\d{2}\/\d{2}/);
        const timeMatch = line.match(/\d{2}:\d{2}/);
        
        // Split teams around 'VS'
        const teams = line.split(/VS|Vs|vs/);
        
        if (teams.length >= 2) {
          fixtures.push({
            date: dateMatch ? dateMatch[0] : 'Upcoming',
            homeTeam: teams[0].replace(/LP|LC|\d{2}\/\d{2}\/\d{2}|\d{2}:\d{2}/g, '').trim(),
            awayTeam: teams[1].split(/STADIUM|FIELD|GROUND|CLUB|LANE/i)[0].trim(),
            scoreOrTime: timeMatch ? timeMatch[0] : '14:00',
            venue: line.match(/SALISBURY|ELCOT|MEADS|REDLAND|STANLEY|BEVERSBROOK|FLYING/i) ? line : ''
          });
        }
      }
    });

    console.log(`OCR extracted ${fixtures.length} matches from image.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

  } catch (err) {
    console.error('Processing error:', err.message);
  } process.exit(0);
}

processFAFixtures();
