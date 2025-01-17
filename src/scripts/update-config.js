const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// Function to get local IP address for Mac and Windows
const getLocalIPAddress = () => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      // Windows command
      command = 'ipconfig';
    } else if (platform === 'darwin' || platform === 'linux') {
      // macOS and Linux command
      command = 'ifconfig';
    } else {
      return reject(new Error('Unsupported platform'));
    }

    exec(command, (err, stdout) => {
      if (err) {
        return reject(err);
      }

      let ipRegex;

      if (platform === 'win32') {
        // Windows IPv4 extraction
        ipRegex = /Wireless LAN adapter Wi-Fi[\s\S]*?IPv4 Address[.\s]*: (\d+\.\d+\.\d+\.\d+)/g;
      } else {
        // macOS/Linux IPv4 extraction
        ipRegex = /inet (\d+\.\d+\.\d+\.\d+)/g;
      }

      const matches = [...stdout.matchAll(ipRegex)].map(match => match[1]);
      const ip = matches.find(ip => !ip.startsWith('127.')); // Ignore localhost

      if (ip) {
        resolve(ip);
      } else {
        reject(new Error('IP address not found'));
      }
    });
  });
};

const updateFile = (filePath, key, value) => {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = false;

  // Recursive function to find and replace key
  const replaceKey = (obj) => {
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        if (k === key) {
          obj[k] = value;
          updated = true;
        } else if (typeof obj[k] === 'object') {
          replaceKey(obj[k]);
        }
      }
    }
  };

  replaceKey(content);

  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`Updated ${key} in ${filePath}`);
  } else {
    console.warn(`${key} not found in ${filePath}`);
  }
};

// Main function
(async () => {
  try {
    const ip = await getLocalIPAddress();
    console.log('Local IP address:', ip);
    const baseUrl = `http://${ip}:8000/`;

    // Update app.json
    updateFile('./app.json', 'API_BASE_URL', baseUrl);

    // Update eas.json
    updateFile('./eas.json', 'API_BASE_URL', baseUrl);
  } catch (error) {
    console.error('Error updating configuration:', error.message);
  }
})();
