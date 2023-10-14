const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000; // You can choose any port you like
app.use(cors());
app.get('/download', async (req, res) => {
  const podcastUrl = req.query.url;

  if (!podcastUrl) {
    return res.status(400).send('Please provide a podcast URL as a query parameter');
  }

  try {
    // Launch a headless Chrome browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', "single-process", "--no-zygote"],
      executablePath:
      process.env.NODE_ENV === "production"
      ? process.env.PUPPETEER_EXECUTABLE_PATH
      :puppeteer.executablePath(),
    });

    // Open a new page
    const page = await browser.newPage();
  
    // Navigate to the URL you want
    const url = 'https://podcasts.apple.com/us/podcast/the-impact-brand-doctor/id1668394191?i=1000609781274'; // Replace with the URL you want to load
    await page.goto(url);
  
    // Wait for the button to become visible and click it
    await page.waitForSelector('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.medium-5.large-4.small-valign-top.small-hide.medium-show-inlineblock > div > div > button'); // Replace 'button-selector' with the actual selector of the button
    await page.click('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.medium-5.large-4.small-valign-top.small-hide.medium-show-inlineblock > div > div > button');
  
    // Wait for the audio tag to become available
    await page.waitForSelector('#apple-music-player'); // Replace 'audio-selector' with the actual selector of the audio tag
  
    // Get the source of the audio tag
    const audioSource = await page.$eval('#apple-music-player', (audio) => audio.src);
    const desc = await page.$eval('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.small-12.medium-7.large-8.small-valign-top > div > div.l-column.small-7.medium-12.small-valign-top > header > div > div.product-hero-desc.product-hero-desc--spacer-bottom-large', (element) => element.textContent);
console.log(audioSource)
console.log(desc)
    // Close the browser
    await browser.close();

    res.json({ audioSource, desc });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the request');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
