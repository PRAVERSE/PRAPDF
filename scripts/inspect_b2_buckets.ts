import fs from 'fs';

async function inspectDataKeys() {
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

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: authHeader }
  });

  const data = await res.json();
  console.log('Top level keys in response:', Object.keys(data));
  console.log('apiUrl:', data.apiInfo?.storageApi?.apiUrl);
  console.log('s3Endpoint:', data.apiInfo?.storageApi?.s3ApiUrl);
  console.log('downloadUrl:', data.apiInfo?.storageApi?.downloadUrl);
  console.log('capabilities:', data.apiInfo?.storageApi?.capabilities);
  console.log('bucketId:', data.apiInfo?.storageApi?.bucketId);
  console.log('bucketName:', data.apiInfo?.storageApi?.bucketName);
  console.log('namePrefix:', data.apiInfo?.storageApi?.namePrefix);

  // If list_buckets capability is present, list buckets!
  const apiUrl = data.apiInfo?.storageApi?.apiUrl || data.apiUrl;
  const authToken = data.authorizationToken;

  if (apiUrl && authToken) {
    console.log('Calling b2_list_buckets on apiUrl:', apiUrl);
    const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
      method: 'POST',
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: data.accountId })
    });
    console.log('list_buckets status:', listRes.status);
    if (listRes.ok) {
      const bucketsData = await listRes.json();
      console.log('Buckets list:');
      for (const b of bucketsData.buckets) {
        console.log(`- name: "${b.bucketName}", id: "${b.bucketId}", type: "${b.bucketType}"`);
      }
    } else {
      console.log('list_buckets error:', await listRes.text());
    }
  }
}

inspectDataKeys().catch(console.error);
