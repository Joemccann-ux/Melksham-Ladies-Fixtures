const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { createWorker } = require('tesseract.js');

const FA_URL = 'https://fulltime.thefa.com/fixtures/1/100.html?selectedSeason=698763392&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_790673203&previousSelectedFixtureGroupKey=1_790673203&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=827700827&previousSelectedClub=827700827&selectedTeam=&selectedFixtureDateStatus=&selectedFixtureStatus=';

async function processFAFixtures() {
  console.log('Launching browser to capture full schedule...');
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    // Extra tall viewport (4500px) ensures ALL table rows fit without scrolling truncation
    await page.setViewport({ width: 1600, height: 4500, deviceScaleFactor: 2 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    await page.goto(FA_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 4000));

    // Hide banners and zoom out slightly to fit all rows clearly
    await page.evaluate(() => {
      const selectorsToHide = ['#onetrust-banner-sdk', 'header', 'footer', '.ad-banner', '.nav-container'];
      selectorsToHide.forEach(s => {
        document.querySelectorAll(s).forEach(el => el.style.display = 'none');
      });
      document.body.style.zoom = '90%';
    });

    await page.screenshot({ path: 'fixtures.png', fullPage: true });
    console.log('Saved full-length screenshot to fixtures.png');
    await browser.close();

    // Perform OCR scan on the full image
    console.log('Scanning full image with Tesseract OCR...');
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

          const cleanTeamName = (name) => {
            return name
              .replace(/^FC\s+FC/, 'FC')
              .replace(/^Mm\s+/, '')
              .replace(/Melksham Town FC\s+Ladies/i, 'Melksham Town FC Ladies')
              .replace(/Melksham Town FC$/i, 'Melksham Town FC Ladies')
              .trim();
          };

          home = cleanTeamName(home);
          away = cleanTeamName(away);

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

    console.log(`Successfully parsed ${fixtures.length} total matches from OCR.`);
    fs.writeFileSync('fixtures.json', JSON.stringify(fixtures, null, 2));

  } catch (err) {
    console.error('OCR Parsing Error:', err.message);
  } finally {
    process.exit(0);
  }
}

processFAFixtures();
