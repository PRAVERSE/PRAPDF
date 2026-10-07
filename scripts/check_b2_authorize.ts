import fs from 'fs';

async function checkB2Authorize() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }

  const keyId = env['B2_2_KEY_ID'] || env['B2_3_KEY_ID'] || env['B2_1_KEY_ID'];
  const appKey = env['B2_2_APPLICATION_KEY'] || env['B2_3_APPLICATION_KEY'] || env['B2_1_APPLICATION_KEY'];

  if (!keyId || !appKey) {
    console.log('No credentials in .env');
    return;
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64');
  console.log('Calling Backblaze b2_authorize_account...');

  try {
    const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('HTTP Status:', res.status);
    if (!res.ok) {
      const errText = await res.text();
      console.log('Authorize failed:', errText);
      return;
    }

    const data = await res.json();
    console.log('SUCCESS! Backblaze B2 Account Authorized!');
    console.log('Allowed Info:');
    console.log('  bucketId:', data.allowed?.bucketId || 'ALL');
    console.log('  bucketName:', data.allowed?.bucketName || 'ALL');
    console.log('  capabilities:', data.allowed?.capabilities);
    console.log('  namePrefix:', data.allowed?.namePrefix || 'NONE');
    console.log('  apiUrl:', data.apiUrl);
    console.log('  s3ApiUrl:', data.s3ApiUrl);
    console.log('  downloadUrl:', data.downloadUrl);

    // If bucketName is restricted, we know the exact bucket!
    // Write this information into a local helper (without secrets)
  } catch (err: any) {
    console.error('Network Error:', err.message);
  }
}

checkB2Authorize();
