// server.ts

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { generateAndZipFiles } from './utils/fileGenerator';


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);

// Middleware to parse URL-encoded bodies (for form data)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to render the form page
app.get('/', (req, res) => {
  res.render('index', {
    statusMessage: null,
    formData: { // Initial empty values for the form fields
      configData: ''
    }
  });
});

// Route to handle form submission, modify files, zip, and send
app.post('/generate-file', async (req, res) => {
  const { configData } = req.body;

  let parsedConfigData: { data?: string, filename?: string }; // Define type for parsed JSON
  try {
    parsedConfigData = JSON.parse(configData);
  } catch (e) {
    return res.render('index', {
      statusMessage: 'Error: Config Data is not valid JSON. Please check your input.',
      formData: req.body // Pass back the invalid string to allow user to correct
    });
  }

  try {
    // Pass the entire parsedConfigData object to generateAndZipFiles
    const { zipBuffer, zipfilename } = await generateAndZipFiles(parsedConfigData as { data: string; filename?: string });

    // Set response headers for file download
    res.attachment(zipfilename); // Sets Content-Disposition header with the filename determined by fileGenerator
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', zipBuffer.length); // Important for browser download progress

    // Send the zip Buffer as the response
    res.send(zipBuffer);
    console.log('Zip Buffer sent to client.');

  } catch (error: any) {
    // If generateAndZipFiles throws an error, catch it here and render the error page
    console.error('Caught error in /generate-file route:', error.message);
    res.render('index', {
      statusMessage: `Error generating file: ${error.message}`,
      formData: req.body
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Open your browser and navigate to this address.');
});
