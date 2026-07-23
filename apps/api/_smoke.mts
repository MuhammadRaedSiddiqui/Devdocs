import app from './src/hono-app';

const health = await app.request('/health');
console.log('health status (expect 200):', health.status);

const noauth = await app.request('/projects', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});
console.log('no-auth /projects (expect 401):', noauth.status);
console.log('IMPORT_OK — Redis did not throw at load');
