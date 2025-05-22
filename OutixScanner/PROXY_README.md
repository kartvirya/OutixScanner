# OutixScanner CORS Proxy

This proxy server is designed to bypass CORS (Cross-Origin Resource Sharing) issues when fetching events from the Outix API endpoints.

## Installation

Make sure you have all the required dependencies installed:

```bash
npm install
```

## Running the Proxy Server

To start the proxy server, run:

```bash
npm run proxy
```

This will start the proxy server on port 3000 (or the port specified in your environment variables).

## How It Works

The proxy server acts as an intermediary between your React Native application and the Outix API. It:

1. Receives requests from your application
2. Forwards them to the actual API
3. Receives the API response
4. Forwards the response back to your application

All this happens with the proper CORS headers set, allowing your application to bypass CORS restrictions.

## API Endpoints

The proxy server exposes the following endpoints:

- `GET /api/events` - Fetches events from the Outix API
- `POST /api/auth` - Authenticates with the Outix API
- `ALL /api/*` - Generic proxy for any other Outix API endpoints

## Using the Proxy in Your Application

The API service in the application has been updated to use the proxy server instead of making direct calls to the Outix API. The proxy URL is set to `http://localhost:3000/api`.

If you need to change the proxy URL (for example, if you're running the proxy on a different port or machine), update the `PROXY_URL` constant in `services/api.ts`.

## Troubleshooting

If you encounter issues with the proxy server:

1. Make sure the proxy server is running (`npm run proxy`)
2. Check that the proxy URL in `services/api.ts` is correct
3. Check the console output of the proxy server for error messages
4. Make sure your device can reach the proxy server (if testing on a physical device, you may need to use your computer's IP address instead of localhost) 