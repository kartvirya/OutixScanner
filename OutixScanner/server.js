const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Base URL for the actual API
const BASE_URL = 'https://www.outix.co/apis';

// Proxy endpoint for events
app.get('/api/events', async (req, res) => {
  try {
    // Extract the auth token from the request headers
    const authToken = req.headers['auth-token'] || '';
    
    // Make the request to the actual API
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error fetching events:', error.message);
    
    // Forward error status if available
    if (error.response) {
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: 'Failed to fetch events' 
    });
  }
});

// Proxy endpoint for getting guest list by event ID
app.get('/api/events/:eventId/guests', async (req, res) => {
  try {
    const { eventId } = req.params;
    const authToken = req.headers['auth-token'] || '8534838IGWQYmheB4432355'; // Use default token if none provided
    
    console.log(`Fetching guest list for event ${eventId} with token: ${authToken ? 'Token exists' : 'No token'}`);
    
    // Make the request to the actual API - corrected URL pattern
    const url = `${BASE_URL}/guestlist/${eventId}`;
    console.log(`Making request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': 'PHPSESSID=fvea4kdra3t2vl5qqt4geoje3t' // Add the PHP session cookie
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`Guest list API response status: ${response.status}`);
    console.log(`Guest list data structure: ${JSON.stringify(Object.keys(response.data || {}))}`);
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error(`Proxy error fetching guest list for event ${req.params.eventId}:`, error.message);
    
    // Forward error status if available
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
      
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    } else if (error.request) {
      console.error('No response received from API server');
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: `Failed to fetch guest list for event ${req.params.eventId}` 
    });
  }
});

// Proxy endpoint for authentication
app.post('/api/auth', async (req, res) => {
  try {
    // Create form data for authentication using form-data package
    const formData = new FormData();
    formData.append('username', req.body.username || 'Outix@thebend.co');
    formData.append('password', req.body.password || 'Scan$9841');
    
    // Make the request to the actual API
    const response = await axios.post(`${BASE_URL}/auth`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 10000
    });
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error authenticating:', error.message);
    
    // Forward error status if available
    if (error.response) {
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: 'Authentication failed' 
    });
  }
});

// Proxy endpoint for check-ins
app.post('/api/checkin', async (req, res) => {
  try {
    const { eventId, guestId, timestamp } = req.body;
    const authToken = req.headers['auth-token'] || '';
    
    // Create form data for check-in
    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('guestId', guestId);
    formData.append('timestamp', timestamp || new Date().toISOString());
    
    // Make the request to the actual API - corrected URL pattern
    const response = await axios.post(`${BASE_URL}/event/checkin`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Auth-Token': authToken
      },
      timeout: 10000
    });
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error checking in guest:', error.message);
    
    // Forward error status if available
    if (error.response) {
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: 'Check-in failed' 
    });
  }
});

// Proxy endpoint for QR code validation
app.get('/api/validate/:eventid/:scancode', async (req, res) => {
  try {
    const { eventid, scancode } = req.params;
    const authToken = req.headers['auth-token'] || '';
    
    console.log(`Validating QR code for event ${eventid}, scancode: ${scancode}`);
    
    // Make the request to the actual API
    const url = `${BASE_URL}/validate/${eventid}/${scancode}`;
    console.log(`Making validation request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`QR validation API response status: ${response.status}`);
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error(`Proxy error validating QR code for event ${req.params.eventid}:`, error.message);
    
    // Forward error status if available
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
      
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: `Failed to validate QR code for event ${req.params.eventid}` 
    });
  }
});

// Proxy endpoint for QR code scanning
app.get('/api/scan/:eventid/:scancode', async (req, res) => {
  try {
    const { eventid, scancode } = req.params;
    const { unscan } = req.query;
    const authToken = req.headers['auth-token'] || '';
    
    console.log(`${unscan ? 'Unscanning' : 'Scanning'} QR code for event ${eventid}, scancode: ${scancode}`);
    
    // Build URL with query parameters
    let url = `${BASE_URL}/scan/${eventid}/${scancode}`;
    if (unscan) {
      url += '?unscan=1';
    }
    console.log(`Making scan request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`QR scan API response status: ${response.status}`);
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error(`Proxy error ${req.query.unscan ? 'unscanning' : 'scanning'} QR code for event ${req.params.eventid}:`, error.message);
    
    // Forward error status if available
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
      
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: `Failed to ${req.query.unscan ? 'unscan' : 'scan'} QR code for event ${req.params.eventid}` 
    });
  }
});

// Generic proxy for other endpoints
app.all('/api/*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api', '');
    const authToken = req.headers['auth-token'] || '';
    
    // Configure request options based on original request
    const options = {
      method: req.method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      timeout: 10000
    };
    
    // Add request body for non-GET requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.data = req.body;
    }
    
    // Make the request to the actual API
    const response = await axios(options);
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error(`Proxy error for ${req.path}:`, error.message);
    
    // Forward error status if available
    if (error.response) {
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: 'Proxy request failed' 
    });
  }
});

// Alternative proxy endpoint for guest list if the first one fails
app.get('/api/guestlist/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const authToken = req.headers['auth-token'] || '8534838IGWQYmheB4432355'; // Use default token if none provided
    
    console.log(`Using alternative endpoint to fetch guest list for event ${eventId}`);
    
    // Try with alternative URL pattern
    const url = `${BASE_URL}/guestlist/${eventId}`;
    console.log(`Making request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Auth-Token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': 'PHPSESSID=fvea4kdra3t2vl5qqt4geoje3t' // Add the PHP session cookie
      },
      timeout: 10000
    });
    
    console.log(`Alternative guest list API response status: ${response.status}`);
    
    // Return the response data
    res.json(response.data);
  } catch (error) {
    console.error(`Alternative proxy error fetching guest list for event ${req.params.eventId}:`, error.message);
    
    // Forward error status if available
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
      
      return res.status(error.response.status).json({
        error: true,
        message: error.message,
        details: error.response.data
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: true, 
      message: `Failed to fetch guest list for event ${req.params.eventId}` 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 