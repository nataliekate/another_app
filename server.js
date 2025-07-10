// server.js

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
console.log(`Serving static files from: ${path.join(__dirname, 'public')}`); // For debugging

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse URL-encoded bodies (for form data)
app.use(bodyParser.urlencoded({ extended: true }));
// Middleware to parse JSON bodies (if you also expect JSON, though not strictly needed for this form)
app.use(bodyParser.json());

// Route to render the form page
app.get('/', (req, res) => {
  // Pass initial data to the template
  res.render('index', {
    statusMessage: null,
    formData: {
      name: '',
      email: '',
      message: '',
      configFileName: 'my-config'
    }
  });
});

// Route to handle form submission and generate the JSON file
app.post('/generate-file', (req, res) => {
  const { name, email, message, configFileName } = req.body;

  // Basic server-side validation
  if (!name || !email || !configFileName) {
    // Re-render the form with an error message and pre-fill data
    return res.render('index', {
      statusMessage: 'Error: Name, Email, and Desired File Name are required.',
      formData: req.body // Pass back existing form data to pre-fill fields
    });
  }

  // Construct the JSON object
  const dataToDownload = {
    name: name,
    email: email,
    message: message,
    generatedAt: new Date().toISOString(),
    // Add more fields here as needed based on your form
  };

  // Convert the JSON object to a string
  const jsonString = JSON.stringify(dataToDownload, null, 2); // null, 2 for pretty printing

  // Determine the filename, ensuring it ends with .json
  const filename = `${configFileName.replace(/\.json$/i, '')}.json`;

  console.log('--- Server: Generating JSON file ---');
  console.log(`File Name: ${filename}`);
  console.log('Content:\n', jsonString);
  console.log('--- End of Server Generation ---');

  // Set headers to trigger file download in the browser
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');

  // Send the JSON string as the response body
  res.send(jsonString);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Open your browser and navigate to this address.');
});
