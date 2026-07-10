const https = require('https');

const destination = '917744020601';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4N2UxMDA0MWQyYjdjMGMwZDkyY2VkYiIsIm5hbWUiOiJBSVREIE9mZmljaWFsIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY3OTQ3MGY4YmMzNjE1MGJmYjczOTIxMSIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTMwOTIxMDB9.TTQF2swfBaK6Lb3HgAEDr4OobXqyatJaS-GbPYEFgw8';

const payload = {
  apiKey: apiKey,
  campaignName: 'agnel_arena_otp',
  destination: destination,
  userName: 'AITD Official',
  templateParams: ['123456'],
  source: 'new-landing-page form',
  media: {},
  buttons: [],
  carouselCards: [],
  location: {},
  attributes: {},
  paramsFallbackValue: {
    FirstName: "user"
  }
};

const options = {
  hostname: 'backend.aisensy.com',
  path: '/campaign/t1/api/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify(payload));
req.end();
