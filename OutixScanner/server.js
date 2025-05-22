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

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 