import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const files=fs.readdirSync('tests').filter(x=>x.endsWith('.test.mjs')).sort();let failed=0;
for(const file of files){const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});if(result.status!==0)failed++}
console.log(`${files.length-failed}/${files.length} test files passed.`);process.exitCode=failed?1:0;
