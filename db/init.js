// Uso: node db/init.js [--reset]
// --reset borra la base antes de crearla (útil cuando cambia el esquema).
import 'dotenv/config';
import { setupDatabase } from './setup.js';

await setupDatabase({ reset: process.argv.includes('--reset') });
