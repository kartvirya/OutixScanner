const os = require('os');

// Get all network interfaces
const networkInterfaces = os.networkInterfaces();

console.log('=== Available IP Addresses ===');
console.log('Use one of these to replace "192.168.1.X" in services/api.ts:');
console.log('--------------------------------');

// Loop through all network interfaces
Object.keys(networkInterfaces).forEach((interfaceName) => {
  const interfaces = networkInterfaces[interfaceName];
  
  // Filter for IPv4 addresses that are not internal
  interfaces
    .filter((iface) => iface.family === 'IPv4' && !iface.internal)
    .forEach((iface) => {
      console.log(`${interfaceName}: ${iface.address}`);
    });
});

console.log('--------------------------------');
console.log('After updating the IP address in services/api.ts, restart your app and proxy server.'); 