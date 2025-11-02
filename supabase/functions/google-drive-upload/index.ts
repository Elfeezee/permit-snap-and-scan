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
    const { folderId, fileName, fileData, mimeType, makePublic } = await req.json();

    if (!folderId || !fileName || !fileData) {
      throw new Error('Missing required parameters');
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

    // Create multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType || 'application/pdf'}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileData +
      closeDelimiter;

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,createdTime',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const responseData = await uploadResponse.json();
    const fileId = responseData.id;

    // Make file public if requested
    if (makePublic && fileId) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
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
