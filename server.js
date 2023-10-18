const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const { spawn } = require('child_process');
const https = require('https');
const axios = require("axios");
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfprobePath('pptruser@srv-ckmmbs2v7m0s73b1rp40-7c47db9b47-8nhj5:/usr/src/app/ffmpeg/bin/ffprobe.exe');
ffmpeg.setFfmpegPath('pptruser@srv-ckmmbs2v7m0s73b1rp40-7c47db9b47-8nhj5:/usr/src/app/ffmpeg/bin/ffmpeg.exe');
var readline = require('readline');
const path = require('path');




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

    const home = "https://instantsop.com/"; 
    const uploadEndpoint = `${home}fileupload`; 

    const page = await browser.newPage();
  
    // Navigate to the URL you want
    const url = podcastUrl; // Replace with the URL you want to load
    await page.goto(url);
  
    // Wait for the button to become visible and click it
    await page.waitForSelector('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.medium-5.large-4.small-valign-top.small-hide.medium-show-inlineblock > div > div > button'); // Replace 'button-selector' with the actual selector of the button
    await page.click('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.medium-5.large-4.small-valign-top.small-hide.medium-show-inlineblock > div > div > button');
  
    // Wait for the audio tag to become available
    await page.waitForSelector('#apple-music-player'); // Replace 'audio-selector' with the actual selector of the audio tag
  
    // Get the source of the audio tag
    const audioSource1 = await page.$eval('#apple-music-player', (audio) => audio.src);
    const desc = await page.$eval('body > div.ember-view > main > div.animation-wrapper.is-visible > div > div > section > div.l-row > div.l-column.small-12.medium-7.large-8.small-valign-top > div > div.l-column.small-7.medium-12.small-valign-top > header > div > div.product-hero-desc.product-hero-desc--spacer-bottom-large', (element) => element.textContent);
console.log(audioSource1)
console.log(desc)

await page.goto(audioSource1);
await page.waitForSelector('body > video > source'); 
const audioSource = await page.$eval('body > video > source', (audio) => audio.src);
console.log(audioSource)

    
    // Close the browser
    await browser.close();

    const outputFileName = 'output.mp3';

    const downloadAudioFile = (url, dest, callback) => {
      console.log("Started download");
      const file = fs.createWriteStream(dest);
      let downloadedBytes = 0;
      let totalBytes = 0;
    
      https.get(url, (response) => {
        totalBytes = response.headers['content-length'];
    
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = (downloadedBytes / totalBytes) * 100;
          readline.clearLine(process.stdout);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`Downloading... ${percent.toFixed(2)}%`);
          file.write(chunk);
        });
    
        response.on('end', () => {
          file.end(() => {
            console.log("\nDownload completed");
            // Now that the file is downloaded, call the callback to initiate processing
            callback(dest);
          });
        });
      });
    
      file.on('error', (error) => {
        console.error('Error writing the file:', error);
      });
    };
    const getAudioDuration = () => {
      //const ffprobe = './ffmpeg/bin/ffprobe.exe';
      //const //ffmpeg = './ffmpeg/bin/ffmpeg.exe';
      ffmpeg.ffprobe(outputFileName, (err, metadata) => {
        if (err) {
          console.error('Error getting duration:', err);
          return;
        }
        const durationInSeconds = metadata.format.duration;
        const startTime = (durationInSeconds / 2) - 300; // Half duration minus 5 minutes (300 seconds)
        extractAndConvertToBase64(startTime);
      });
    };

    const extractAndConvertToBase64 = (startTime) => {
      const duration = '00:10:00';  // Duration (10 minutes)

      ffmpeg()
        .input(outputFileName)
        .setStartTime(startTime)
        .setDuration(duration)
        .output('output1.mp3')
        .on('end', () => {
          const audioSource = fs.readFileSync('output.mp3', { encoding: 'base64' });
          const payload = {
            name: "output.mp3",
            contents: audioSource,
            private: false 
          }
          
          axios.post(uploadEndpoint, payload)
          .then(response => {
      
            console.log("Response:", response.data);
            const fileURL = response.data;
            const httpsFileURL = `https:${fileURL}`;
          })
          .catch(error => {
        
            console.error("Error:", error);
          });
          //console.log(audioSource);
          fs.unlinkSync(outputFileName); // Cleanup temporary file
        })
        .run();
    };

    
 downloadAudioFile(audioSource, outputFileName, getAudioDuration);



    res.json({ audioSource, desc });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing the request');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});