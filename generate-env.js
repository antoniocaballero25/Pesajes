// generate-env.js  (en la raíz del proyecto, junto a package.json)
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan SUPABASE_URL o SUPABASE_KEY');
  process.exit(1);
}

const envProd = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

const envDev = `export const environment = {
  production: false,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

fs.writeFileSync('./src/environments/environment.prod.ts', envProd);
fs.writeFileSync('./src/environments/environment.ts', envDev);
console.log('✅ Ficheros de entorno generados correctamente');