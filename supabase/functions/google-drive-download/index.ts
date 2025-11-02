import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT, importPKCS8 } from "npm:jose@^5.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/drive.file',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setIssuer(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(serviceAccount.private_key, 'RS256'));

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileId } = await req.json();

    if (!fileId) {
      throw new Error('File ID is required');
    }

    let serviceAccountJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('Google Drive service account not configured');
    }

    serviceAccountJson = serviceAccountJson.trim();
    if ((serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')) ||
        (serviceAccountJson.startsWith("'") && serviceAccountJson.endsWith("'"))) {
      serviceAccountJson = serviceAccountJson.slice(1, -1);
    }

    const credentials = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(credentials);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download file: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for transport
    const base64Data = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: base64Data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error downloading file:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
