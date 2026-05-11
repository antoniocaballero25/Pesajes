// generate-env.js
const fs = require('fs');

const env = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseKey: '${process.env.SUPABASE_KEY}'
};
`;

fs.writeFileSync('./src/environments/environment.prod.ts', env);
console.log('✅ environment.prod.ts generado');