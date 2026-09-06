import fs from 'fs';
const envPath = '.env';
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const keyObj = {
  "type": "service_account",
  "project_id": "gen-lang-client-0036916917",
  "private_key_id": "5b1192b3d1c8074359261f4c4fd02a7f55b2887c",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDjgOK3VRoPL9nX\nttbMHM+vodsgTOFSHzR/7mMZ9KlBQ3CinfTOPoTaVIj1JOAKVy9SnjjSlOtKYTjk\nKsd6eqVByLfqQKZePzUtC1tJlqeGYXtEZFVhKURASwn6x0k9IpTY11Mdb7MgjnSK\nJaQhnSZItvCgZmJUtmQTdFBmB8QY6+ChqvvO/qjfxA4dkceQILwbFiZDU9pdZcuM\nUUNdYcD/BFjLup+jRNFkA28T8LQj8xo1CO8WjmdUjj5PQEkIuavnQZDlnEHRTVye\n/6BHlEfnTWgpgGKnyzm/GThgpg2cTr4bRYbbkp9Vp/Py9juFzXYclzSWrCV4bWMu\nFac+BK1FAgMBAAECggEAGuVt6EbDYfBCTOJs2oy9cQItqc/tA4x05HsGdFcce37B\nnjgWbRuvETDVUEYfxpkwGxBhn2PDvXNpCnCUTMKbLv/P3n3uLU5DtyOUk0qgW57C\nt/80qNv8Ga3FbESLQBMKjehHBz/haYPt+zcgBGlT0Vzvbccs8N7vTe1+Y9GfOWLQ\nh5i76Xr9JKhITKdaXnb82mF3kSt6v7GUTnOubK/V8z8wB2Jdln3JJTELVgsH61Yg\n9p2uOWa0sEtABLpvlSLM1w/4rg2v915w6jvtbwc4mOlYGvHceqfEmn4ltTdmwwbj\noRxy4IKQkYmlKT1i621tydO6cod3nyj3Cv73hftlAQKBgQDyQC/GfTXVvRTLIHQI\nce4dcMj4zrc4ax3nWO6M8rvL2cnaxoqMMRwzNTCvszs+lO9WcwIeG+G/RDzPluSp\nzUhrYL0aciLMZniMYW0wxXjEKPzb8OlBI+4BJuc9z1pA27tm13bpvpDPjddzEE4B\nshwlk1DOF9BXRfVC/cv02d/SdQKBgQDwam03GLnvj++5xcBW6dD5SLA8TYXnOiqu\n8B1uHHcVsBgnXlGc/9u2AY0UhV85WKDDu7pEH6Y+XcSJSSCqvpoGcb2yposaDsQm\nyPnuJ6+uj1UjzXkmH60jX6uxxEY/6xPZDI9wrMDAcjtVkp1ARqm9ukHl04MNjHP0\ntU9L7vN1kQKBgH71ytQhDRTeysYGVSmT5DKDyKA1XmrwILT9s9Ak6u1UT+kbwsLk\nfh4MU17R9UvALItHLSXwgOiH78LwFxky4DB+e70fckNjtOwFp383DyrnPFZctTKR\njQwHgouvX2K8hkPIyqaIXEaa1P6V3fwfh4bd5SyN6H/Ex1x7vOevRBF9AoGADZ0J\nKCiHRtBws6VF+eXthmAeUpvVLD238wX3tKd5+slo5LnLh0dZqpm14maW+MlS+SJl\nLrxYDooCuf9hESoP0LOaGUai88vIQaX5uQmYQhstqARXitgaVrlxIHTLwYzPJ+g1\nKx0tIPiW8YaGzv/xVqP4XUo3zomYe0/U+KjEMnECgYEAs8ek6v0gZvKwhj2hLv2+\nwZB6EjBpsPWVLfFuTbb7FCjTEwe1Da5kf4mmYDzZfbv11i6hAzDkdhyA0/3EUl+f\nmXSErQoiDvkAAKimJM7F2v034gIu75kpgwVFfdOgPgA7SJiuFYHxOKQY2cEo0FDd\nIOetTmOBCCuDGQGNpgH73z8=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@gen-lang-client-0036916917.iam.gserviceaccount.com",
  "client_id": "111566127449438535393",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gen-lang-client-0036916917.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const keyStr = JSON.stringify(keyObj);

// Remove existing FIREBASE_SERVICE_ACCOUNT if any
envContent = envContent.split('\n').filter(line => !line.startsWith('FIREBASE_SERVICE_ACCOUNT=')).join('\n');
envContent += `\nFIREBASE_SERVICE_ACCOUNT='${keyStr}'\n`;

fs.writeFileSync(envPath, envContent.trim() + '\n');
console.log("Injected Service Account into .env");
