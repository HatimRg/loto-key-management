// Test script to check GitHub update feed
const https = require('https');

const owner = 'HatimRg';
const repo = 'loto-key-management';

// Check latest.yml from GitHub
const url = `https://github.com/${owner}/${repo}/releases/latest/download/latest.yml`;

console.log('🔍 Testing update feed...');
console.log('📡 URL:', url);
console.log('');

https.get(url, (res) => {
  let data = '';
  
  console.log('📊 Status Code:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  console.log('');
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 latest.yml Content:');
    console.log('─'.repeat(50));
    console.log(data);
    console.log('─'.repeat(50));
    console.log('');
    
    // Parse the version
    const versionMatch = data.match(/version:\s*(.+)/);
    if (versionMatch) {
      console.log('✅ Version found:', versionMatch[1].trim());
    } else {
      console.log('❌ No version found in latest.yml');
    }
    
    // Check for exe file
    const exeMatch = data.match(/url:\s*(.+\.exe)/);
    if (exeMatch) {
      console.log('✅ Installer found:', exeMatch[1].trim());
    } else {
      console.log('❌ No installer found in latest.yml');
    }
  });
}).on('error', (err) => {
  console.error('❌ Error fetching latest.yml:', err.message);
  console.log('');
  console.log('💡 Possible issues:');
  console.log('  - Release is not published (still in draft)');
  console.log('  - Repository is private');
  console.log('  - Owner/repo name is incorrect');
  console.log('  - latest.yml is not uploaded to the release');
});
