import { parseDefs } from './parser';
import { initREPL, runREPL } from './repl';
import { setConfig } from './config';
import { globalReset, globalMap } from './globalenv';
import { typecheckDefs } from './typecheck';
import { showTermSZ, normalize } from './domain';
import { showSurfaceZ } from './syntax';
import { Nil } from './utils/list';

if (process.argv[2]) {
  const option = process.argv[3] || '';
  if (option.includes('d')) setConfig({ debug: true });
  if (option.includes('e')) setConfig({ showEnvs: true });
  if (option.includes('v')) setConfig({ verify: true });
  try {
    globalReset();
    const sc = require('fs').readFileSync(process.argv[2], 'utf8');
    parseDefs(sc, {}).then(ds => {
      const ns = typecheckDefs(ds, false);
      const m = globalMap();
      const main = m.main;
      if (!main) console.log(`defined ${ns.join(' ')}`);
      else {
        console.log(`${showSurfaceZ(main.term)} : ${showTermSZ(main.type)}`);
        console.log(`${showSurfaceZ(normalize(main.term, Nil, 0, true))}`);
      }
      process.exit();
    }).catch(err => {
      console.error(err);
      process.exit();
    });
  } catch(err) {
    console.error(err);
    process.exit();
  };
} else {
  const _readline = require('readline').createInterface(process.stdin, process.stdout);
  console.log('tinka repl');
  process.stdin.setEncoding('utf8');
  function _input() {
    _readline.question('> ', function(_i: string) {
      runREPL(_i, (s: string, e?: boolean) => {
        console.log(s);
        setImmediate(_input, 0);
      });
    });
  };
  initREPL();
  _input();
}
