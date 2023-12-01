const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const { spawn } = require('child_process');
const https = require('follow-redirects').https;
const axios = require("axios");
const path = require('path');
const ffmpeg_static = require('ffmpeg-static');
const ffmprobe_static = require('ffprobe-static');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegsrc = require('ffmpeg');
ffmpegsrc.bin = ffmpeg_static.path
ffmpeg.setFfmpegPath(ffmpeg_static);
ffmpeg.setFfprobePath(ffmprobe_static.path);
console.log(ffmprobe_static.path);
console.log(ffmpeg_static);
var readline = require('readline');
const url = require('url');
const { start } = require('repl');
const { JSDOM } = require('jsdom');





console.log("Current directory:", __dirname);
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

    const home = "https://podcastapp-10952.bubbleapps.io/"; 
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

let audioSource;
let audioSource2;
let audiomain;
let blacklist = []
if (audioSource1.includes("chtbl") || audioSource1.includes("chrtwdw")) {
  audioSource2 = 'https://' + audioSource1.substring(audioSource1.indexOf("dovetail.prxu.org"));
  audiomain = audioSource2;
  console.log('this route')
} else {
  audiomain = audioSource1;

}

if (!blacklist.some(item => audioSource1.includes(item))) {
  try {
  await page.goto(audiomain);
  await page.waitForSelector('body > video > source'); 

 
    audioSource = await page.$eval('body > video > source', (audio) => audio.src);
    // Rest of your code that uses audioSource
  } catch (error) {
    console.log('the other route')

   
      console.log("redcircle")
      console.log(audiomain)
    
      const getAudioUrl = (audiomain) => {
        return new Promise((resolve, reject) => {
          https.get(audiomain, (response) => {
            let data = '';
            response.on('data', (chunk) => {
              data += chunk;
            });
            response.on('end', () => {
              const dom = new JSDOM(data);
              const audioUrl = dom.window.document.querySelector('a').href;
              console.log(audioUrl);
              resolve(audioUrl);
            });
          }).on('error', (err) => {
            console.error(`Error: ${err.message}`);
            reject(err);
          });
        });
      };
      console.log("ahref")

      //let audioSourcez = await getAudioUrl(audiomain);

        console.log("ahref")
      //audioSourcez = await getAudioUrl(audioSourcez);
      //const indexOfMp3 = audioSourcez.indexOf(".mp3");

      // Remove everything after ".mp3"
      //audioSourcez = audioSourcez.substring(0, indexOfMp3 + 4); 
      audioSource = audiomain;
  }        
  console.log(`wefwef${audioSource}`)

} 

    // Close the browser
    await browser.close();
    let r = (Math.random() + 1).toString(36).substring(7);
    const outputFileName = `${r}.mp3`;
    console.log(`final src = ${audioSource}`)

    const downloadAudioFile = (url, dest, callback) => {
      console.log("Started download");
      const file = fs.createWriteStream(dest);
      let downloadedBytes = 0;
      let totalBytes = 0;
    
      https.get(url, (response) => {
        console.log(url)
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
        let startTime;
        if (durationInSeconds < 600){

          startTime = 0;

        } // Half duration minus 5 minutes (300 seconds)
        else {
          startTime = (durationInSeconds / 2) - 300;



        }
        extractAndConvertToBase64(startTime, durationInSeconds);
      });
    };

    const extractAndConvertToBase64 = (startTime, durationInSeconds) => {
      let duration;
      if (durationInSeconds < 600){
    //duration should be the entire length of the podcast
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = durationInSeconds % 60;
    duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } 
      else {

        duration = '00:10:00';  // Duration (10 minutes)

      }
      ffmpeg()
        .input(outputFileName)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(`${r}1.mp3`)
        .on('end', () => {
          const audioSource = fs.readFileSync(`${r}1.mp3`, { encoding: 'base64' });
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
            res.json({ httpsFileURL, desc });
          })
          .catch(error => {
        
            console.error("Error:", error);
          });
          
          //console.log(audioSource);
          fs.unlinkSync(`${r}1.mp3`); // Cleanup temporary file
          fs.unlinkSync(`${r}.mp3`);
        })
        .run();
    };

 downloadAudioFile(audioSource, outputFileName, getAudioDuration);

console.log('finished')






} catch (error) {
  console.error(error);
  res.status(500).send('An error occurred while processing the request');
}
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});