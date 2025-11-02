import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT, importPKCS8 } from "npm:jose@^5.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccount: any) {
  console.log("Service Account Email:", serviceAccount.client_email);
  const now = Math.floor(Date.now() / 1000);
  
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  
  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);

  console.log("Generated JWT");

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to get access token:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  console.log("Successfully got access token");
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  console.log("google-drive-upload function invoked.");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const credentials = {
      "type": "service_account",
      "project_id": "kasupda-portal-477014",
      "private_key_id": "9b373f44ae8df81400ed3a3bf453e45dbd00bcb7",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQCVcGAQPBdwAdxk\nO2UJj/RdjhiAq85AqROHc5AzXWmwRwNukXoSU81ayBc/svb/4G8ZKYQL5EB8Mt/X\nuiuDHvEls2XNlaaB7JRiv/yvwhp13Osa+cy3CQ5xIaVvhWdlRg7D3OBAab5LuKjW\n//Rm3HbJKSLvqjEUYCB0bXJ/slAVnYJLp9KcudQQVh5LUtFKncEoF6eLziPh0Ep8\nsJRlRhpBDTNUG4QcF6FF8ftJPqm5lEOAketOUCOORjERLgfkpbCDeaSUXP/kSSl7\n+A+xZnRVN9kZWArZ9hPwAkW/A8+XT5aRjNvt41u/NW9d6uAyht89lKJemztQfMV+\nhS0pDcfbAgMBAAECgf84FJiKo7lMhkGvEpsPDeSUW/XWCqOTMruhdM8owK6yHRjR\nLsb8PlIt0aAMfnhXsqsjRjpZ8vMbqNdYC5fa+IrP9pVQEX2h+zjY+sXG5mxQzvKQ\niHc4gmRpEEmp68HPUfs4hZkQSgxWzAf+XjQi+Cubv+aTU4IXo2kc2ogv0YQXvIOj\n3hNtkOzxX12fn7VKdv/hdpu5dUsCFjfSLtHtIemVfpr2RJc6gAxSGymR8S+tdJjr\n2cqio1N7xsVx8Gf6E7i4Ya/pytc/yZUddBVzXyce/Z3qhx0D1A0GVEAO1vUT+sJz\n8nol4fzGYjd5RJHNi5kAPczG8rjNx6WNgk8mPVUCgYEAzoboQXGjtJIePN2NFcoM\n+nuH74l0bW4a1g/ihnwB9smfBbuKEukzkhEDKzSNujz7vR30onL3ANlcHEYnoR0d\nU5xI4PdpAB2aKePiKE6bcgqpazy3vkjfUd7SbstT0jPfg8Q9lEsgDaBt0YOlsuHa\n/CjW3OkYmuaZ+CnDuGSm4q8CgYEAuTyX+RCh1pIro2PnG9kuXE7TURveVFQ+Rgnn\nkGFNtE4vby/XWEZAxsksVfzPqF0A22ma0GmGibwQa8G1hmiZucFrcY34psd73ci3\nKIukqpD6eeku+LSlhh9mr0hWTSri5a6vlczRyl6BNxJFD9Cmod0FfLOo4u4p7cDU\n24GnqJUCgYAo3OqBYGG6rZqMAm4S3Jp6yQxZacH+kOWAaz4vy8N7t+Ld+IBWQ4vv\nn6wX1VsheUV54r5vkf2rTlZ6Ras7po4R5/9He8xruG+zUCKERSFejBt/W1Ejtjlx\ncnwCbfqUway83owsljyuVYrFBJ45aZSxhccViI1UwMHAJ0tRZaDbgwKBgGzF3Cfx\nUFeDtgRYIdoEimjCEOzMBJ5YackO/9+Ug+ChGNGdskKv3lHcyCAmOHqRQnOVa8d+\nb/ZpbOsZ8NJgkgS2Q7WGvMCS23W863Dvr15JjAwSlfaNfbVosw+y1pqx2FMvZQP+\nJiNDo3UHUW6cA32BIDu99Cpt2Ek4tsW/OQiRAoGADz0UA/EOrNAs57IXcPpWEr9n\n7NIJheTjU8cWA3Q3K4es/+QU3dn3r1Y6Q2UjP0EwuohfOInn/3OvopzXXa9EVYzo\nAeDicqc5b9CNKAue9tIpNMy+FDME4Ib4r3mB6pI58Kszo+vhrNlyt8OPvBjd1cpJ\nr3lf81AzlsrWz7cpd2I=\n-----END PRIVATE KEY-----\n",
      "client_email": "kasupdaportal@kasupda-portal-477014.iam.gserviceaccount.com",
      "client_id": "111486990340865997677",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/kasupdaportal%40kasupda-portal-477014.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
    };

    const { folderId, fileName, fileData, mimeType, makePublic } = await req.json();

    if (!folderId || !fileName || !fileData) {
      throw new Error('Missing required parameters');
    }

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

    console.log("Uploading to Google Drive...");
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
      console.error("Upload failed:", errorText);
      throw new Error(`Upload failed: ${errorText}`);
    }

    console.log("Successfully uploaded file");
    const responseData = await uploadResponse.json();
    const fileId = responseData.id;

    // Make file public if requested
    if (makePublic && fileId) {
      console.log("Making file public...");
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
      console.log("Successfully made file public");
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
    console.error('Error uploading to Google Drive:', error.message);
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
