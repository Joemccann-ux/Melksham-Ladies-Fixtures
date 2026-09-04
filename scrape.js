const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createWorker } = require('tesseract.js');

puppeteer.use(StealthPlugin());

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function processFAFixtures() {
  console.log('Launching stealth browser to bypass Cloudflare...');
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 4500, deviceScaleFactor: 2 });

    // Custom headers to look like a standard desktop browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
    });

    console.log('Navigating to FA page...');
    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

    // Hide banners and overlays
    await page.evaluate(() => {
      const selectorsToHide = ['#onetrust-banner-sdk', 'header', 'footer', '.ad-banner', '.nav-container'];
      selectorsToHide.forEach(s => {
        document.querySelectorAll(s).forEach(el => el.style.display = 'none');
      });
    });

    await page.screenshot({ path: 'fixtures.png', fullPage: true });
    console.log('Saved stealth screenshot to fixtures.png');
    await browser.close();

    // Perform OCR scan
    console.log('Scanning fixtures.png with Tesseract OCR...');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize('fixtures.png');
    await worker.terminate();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const fixtures = [];

    lines.forEach(line => {
      if (/\d{2}\/\d{2}\/\d{2}/.test(line) && /VS|Vs|vs/.test(line)) {
        const dateMatch = line.match(/\d{2}\/\d{2}\/\d{2}/);
        const timeMatch = line.match(/\d{2}:\d{2}/);

        const rawDate = dateMatch ? dateMatch[0] : '';
        const matchTime = timeMatch ? timeMatch[0] : '14:00';

        // Detect Venues
        let venue = '';
        const venueKeywords = [
          'MEADS OF MELKSHAM COMMUNITY FOOTBALL STADIUM',
          'SALISBURY FOOTBALL CLUB',
          'ELCOT LANE PLAYING FIELD',
          'THE ELMS RECREATION GROUND',
          'REDLAND LANE',
          'THE RED HOUSE',
          'STANLEY PARK SPORTS GROUND',
          'BEVERSBROOK SPORTS FACILITY',
          'THE FLYING MONK GROUND'
        ];

        for (const kw of venueKeywords) {
          if (line.toUpperCase().includes(kw)) {
            venue = kw;
            break;
          }
        }

        // Clean out noise from team strings
        let cleanedLine = line
          .replace(/LP|LC|HC/g, '')
          .replace(/\d{2}\/\d{2}\/\d{2}/g, '')
          .replace(/\d{2}:\d{2}/g, '')
          .replace(/Ladies Premier Division|Ladies League Cup|Ladies Premier|Division|League Cup/gi, '')
          .replace(/[®\)\(]|Mm|Status\/Notes/g, '')
          .trim();

        if (venue) {
          cleanedLine = cleanedLine.replace(new RegExp(venue, 'gi'), '').trim();
        }

        const teams = cleanedLine.split(/VS|Vs|vs/);
        if (teams.length >= 2) {
          let home = teams[0].replace(/\s+/g, ' ').trim();
          let away = teams[1].replace(/\s+/g, ' ').trim();

          const sanitizeTeam = (name) => {
            return name
              .replace(/^FC\s+FC/, 'FC')
              .replace(/^Mm\s+/, '')
              .replace(/Melksham Town FC\s+Ladies/i, 'Melksham Town FC Ladies')
              .replace(/Melksham Town FC$/i, 'Melksham Town FC Ladies')
              .trim();
          };

          home = sanitizeTeam(home);
          away = sanitizeTeam(away);

          if (home && away) {
            fixtures.push({
              date: rawDate || 'Upcoming',
              homeTeam: home,
              awayTeam: away,
              scoreOrTime: matchTime,
              venue: venue ? venue.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : ''
            });
          }
        }
      }
    });

    console.log(`Parsed ${fixtures.length} matches via stealth OCR.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

  } catch (err) {
    console.error('Stealth Scraper Error:', err.message);
  } finally {
    process.exit(0);
  }
}

processFAFixtures();
