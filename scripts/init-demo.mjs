import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../examples/sample.sqlite',import.meta.url));
if(fs.existsSync(file))throw Error('sample_database_already_exists');
const db=new DatabaseSync(file);
try{db.exec("CREATE TABLE notes(id INTEGER PRIMARY KEY,title TEXT NOT NULL); INSERT INTO notes VALUES (1,'MCP 示例'),(2,'Local tools');");}finally{db.close();}
console.error('Fictional sample database created.');
