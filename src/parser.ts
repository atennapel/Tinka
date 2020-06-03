import { serr, loadFile } from './utils/utils';
import { Term, Var, App, Type, Abs, Pi, Let, Ann, Hole, Sigma, Pair, Enum, Elem, EnumInd, isPrimName, Prim, Proj, PCore, PIndex, PName } from './surface';
import { Name } from './names';
import { Def, DDef } from './surface';
import { log } from './config';

type BracketO = '(' | '{'
type Bracket = BracketO | ')' | '}';
const matchingBracket = (c: Bracket): Bracket => {
  if(c === '(') return ')';
  if(c === ')') return '(';
  if(c === '{') return '}';
  if(c === '}') return '{';
  return serr(`invalid bracket: ${c}`);
};

type Token
  = { tag: 'Name', name: string }
  | { tag: 'Num', num: string }
  | { tag: 'List', list: Token[], bracket: BracketO };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TNum = (num: string): Token => ({ tag: 'Num', num });
const TList = (list: Token[], bracket: BracketO): Token => ({ tag: 'List', list, bracket });

const SYM1: string[] = ['\\', ':', '/', '*', '=', '|', ','];
const SYM2: string[] = ['->', '**'];

const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const tokenize = (sc: string): Token[] => {
  let state = START;
  let r: Token[] = [];
  let t = '';
  let esc = false;
  let p: Token[][] = [], b: BracketO[] = [];
  for (let i = 0, l = sc.length; i <= l; i++) {
    const c = sc[i] || ' ';
    const next = sc[i + 1] || '';
    if (state === START) {
      if (SYM2.indexOf(c + next) >= 0) r.push(TName(c + next)), i++;
      else if (SYM1.indexOf(c) >= 0) r.push(TName(c));
      else if (c === '.' && !/[\.\?\@\#\%\_a-z]/i.test(next)) r.push(TName('.'));
      else if (c + next === '--') i++, state = COMMENT;
      else if (/[\.\?\@\#\%\_a-z]/i.test(c)) t += c, state = NAME;
      else if (/[0-9]/.test(c)) t += c, state = NUMBER;
      else if(c === '(' || c === '{') b.push(c), p.push(r), r = [];
      else if(c === ')' || c === '}') {
        if(b.length === 0) return serr(`unmatched bracket: ${c}`);
        const br = b.pop() as BracketO;
        if(matchingBracket(br) !== c) return serr(`unmatched bracket: ${br} and ${c}`);
        const a: Token[] = p.pop() as Token[];
        a.push(TList(r, br));
        r = a;
      }
      else if (/\s/.test(c)) continue;
      else return serr(`invalid char ${c} in tokenize`);
    } else if (state === NAME) {
      if (!(/[a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === NUMBER) {
      if (!/[0-9a-z]/i.test(c)) {
        r.push(TNum(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === COMMENT) {
      if (c === '\n') state = START;
    }
  }
  if (b.length > 0) return serr(`unclosed brackets: ${b.join(' ')}`);
  if (state !== START && state !== COMMENT)
    return serr('invalid tokenize end state');
  if (esc) return serr(`escape is true after tokenize`);
  return r;
};

const tunit = Var('UnitType');
const unit = Var('Unit');

const isName = (t: Token, x: Name): boolean =>
  t.tag === 'Name' && t.name === x;
const isNames = (t: Token[]): Name[] =>
  t.map(x => {
    if (x.tag !== 'Name') return serr(`expected name`);
    return x.name;
  });

const splitTokens = (a: Token[], fn: (t: Token) => boolean, keepSymbol: boolean = false): Token[][] => {
  const r: Token[][] = [];
  let t: Token[] = [];
  for (let i = 0, l = a.length; i < l; i++) {
    const c = a[i];
    if (fn(c)) {
      r.push(t);
      t = keepSymbol ? [c] : [];
    } else t.push(c);
  }
  r.push(t);
  return r;
};

const lambdaParams = (t: Token): [Name, boolean, Term | null][] => {
  if (t.tag === 'Name') return [[t.name, false, null]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return isNames(a).map(x => [x, impl, null]);
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid lambda param`);
};
const piParams = (t: Token): [Name, boolean, Term][] => {
  if (t.tag === 'Name') return [['_', false, expr(t)[0]]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return [['_', impl, expr(t)[0]]];
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid pi param`);
};

const parseProj = (t: Term, xx: string): Term => {
  const spl = xx.split('.');
  let c = t;
  for (let i = 0; i < spl.length; i++) {
    const x = spl[i];
    const n = +x;
    let proj;
    if (!isNaN(n) && n >= 0 && Math.floor(n) === n) proj = PIndex(n);
    else if (x === 'fst') proj = PCore('fst');
    else if (x === 'snd') proj = PCore('snd');
    else proj = PName(x);
    c = Proj(proj, c);
  }
  return c;
};

const expr = (t: Token): [Term, boolean] => {
  if (t.tag === 'List')
    return [exprs(t.list, '('), t.bracket === '{'];
  if (t.tag === 'Name') {
    const x = t.name;
    if (x === '*') return [Type, false];
    if (x.startsWith('_')) return [Hole(x.slice(1) || null), false];
    if (x.startsWith('#')) {
      const n = +x.slice(1);
      if (isNaN(n) || n < 0 || Math.floor(n) !== n) return serr(`invalid enum ${x}`);
      return [Enum(n), false];
    }
    if (x.startsWith('@')) {
      const s = x.slice(1);
      const spl = s.split('/');
      if (spl.length === 1) {
        const n = +spl[0];
        if (isNaN(n) || n < 0 || Math.floor(n) !== n) return serr(`invalid elem ${x}`);
        return [Elem(n, null), false];
      } else if (spl.length === 2) {
        const n = +spl[0];
        if (isNaN(n) || n < 0 || Math.floor(n) !== n) return serr(`invalid elem ${x}`);
        const m = +spl[1];
        if (isNaN(m) || m < 0 || Math.floor(m) !== m) return serr(`invalid elem ${x}`);
        return [Elem(n, m), false];
      } else return serr(`invalid elem ${x}`);
    }
    if (x[0] === '%') {
      const rest = x.slice(1);
      if (isPrimName(rest)) return [Prim(rest), false];
      return serr(`invalid prim: ${x}`);
    }
    if (/[a-z]/i.test(x[0])) {
      if (x.includes('.')) {
        const spl = x.split('.');
        const v = spl[0];
        const rest = spl.slice(1).join('.');
        return [parseProj(Var(v), rest), false];
      }
      return [Var(x), false];
    }
    return serr(`invalid name: ${x}`);
  }
  if (t.tag === 'Num') {
    if (t.num.endsWith('b')) {
      const n = +t.num.slice(0, -1);
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s0 = Var('B0');
      const s1 = Var('B1');
      let c: Term = Var('BE');
      const s = n.toString(2);
      for (let i = 0; i < s.length; i++) c = App(s[i] === '0' ? s0 : s1, false, c);
      return [c, false];
    } else {
      const n = +t.num;
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s = Var('S');
      let c: Term = Var('Z');
      for (let i = 0; i < n; i++) c = App(s, false, c);
      return [c, false];
    }
  }
  return t;
};

const exprs = (ts: Token[], br: BracketO): Term => {
  if (br === '{') return serr(`{} cannot be used here`);
  if (ts.length === 0) return unit;
  if (ts.length === 1) return expr(ts[0])[0];
  if (isName(ts[0], 'let')) {
    const x = ts[1];
    let impl = false;
    let name = 'ERROR';
    if (x.tag === 'Name') {
      name = x.name;
    } else if (x.tag === 'List' && x.bracket === '{') {
      const a = x.list;
      if (a.length !== 1) return serr(`invalid name for let`);
      const h = a[0];
      if (h.tag !== 'Name') return serr(`invalid name for let`);
      name = h.name;
      impl = true;
    } else return serr(`invalid name for let`);
    let ty: Term | null = null;
    let j = 2;
    if (isName(ts[j], ':')) {
      const tyts: Token[] = [];
      j++;
      for (; j < ts.length; j++) {
        const v = ts[j];
        if (v.tag === 'Name' && v.name === '=')
          break;
        else tyts.push(v);
      }
      ty = exprs(tyts, '(');
    }
    if (!isName(ts[j], '=')) return serr(`no = after name in let`);
    const vals: Token[] = [];
    let found = false;
    let i = j + 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (c.tag === 'Name' && c.name === 'in') {
        found = true;
        break;
      }
      vals.push(c);
    }
    if (!found) return serr(`no in after let`);
    if (vals.length === 0) return serr(`empty val in let`);
    const val = exprs(vals, '(');
    const body = exprs(ts.slice(i + 1), '(');
    if (ty)
      return Let(impl, name, ty, val, body);
    if (val.tag === 'Ann')
      return Let(impl, name, val.type, val.term, body);
    return Let(impl, name, null, val, body);
  }
  const i = ts.findIndex(x => isName(x, ':'));
  if (i >= 0) {
    const a = ts.slice(0, i);
    const b = ts.slice(i + 1);
    return Ann(exprs(a, '('), exprs(b, '('));
  }
  if (isName(ts[0], '\\')) {
    const args: [Name, boolean, Term | null][] = [];
    let found = false;
    let i = 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (isName(c, '.')) {
        found = true;
        break;
      }
      lambdaParams(c).forEach(x => args.push(x));
    }
    if (!found) return serr(`. not found after \\ or there was no whitespace after .`);
    const body = exprs(ts.slice(i + 1), '(');
    return args.reduceRight((x, [name, impl, ty]) => Abs(impl, name, ty, x), body);
  }
  if (ts[0].tag === 'Name' && ts[0].name[0] === '.') {
    const x = ts[0].name.slice(1);
    if (ts.length < 2) return serr(`something went wrong when parsing .${x}`);
    if (ts.length === 2) {
      const [term, tb] = expr(ts[1]);
      if (tb) return serr(`something went wrong when parsing .${x}`);
      return parseProj(term, x);
    }
    const indPart = ts.slice(0, 2);
    const rest = ts.slice(2);
    return exprs([TList(indPart, '(')].concat(rest), '(');
  }
  if (ts[0].tag === 'Name' && ts[0].name[0] === '?') {
    const x = ts[0].name;
    const n = +x.slice(1);
    if (isNaN(n) || n < 0 || Math.floor(n) !== n) return serr(`invalid elem ind ${x}`);
    const [prop, b] = expr(ts[1]);
    if (!b) return serr(`in ${x} prop needs to be implicit`);
    const [term, b2] = expr(ts[2]);
    if (b2) return serr(`in ${x} term cannot be implicit`);
    const cases = ts.slice(3).map(t => {
      const [tt, b] = expr(t);
      if (b) return serr(`in ${x} case cannot be implicit`);
      return tt;
    });
    return EnumInd(n, prop, term, cases);
  }
  const j = ts.findIndex(x => isName(x, '->'));
  if (j >= 0) {
    const s = splitTokens(ts, x => isName(x, '->'));
    if (s.length < 2) return serr(`parsing failed with ->`);
    const args: [Name, boolean, Term][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Term]])
      .reduce((x, y) => x.concat(y), []);
    const body = exprs(s[s.length - 1], '(');
    return args.reduceRight((x, [name, impl, ty]) => Pi(impl, name, ty, x), body);
  }
  const js = ts.findIndex(x => isName(x, '**'));
  if (js >= 0) {
    const s = splitTokens(ts, x => isName(x, '**'));
    if (s.length < 2) return serr(`parsing failed with **`);
    // TODO: erasure in second component
    const args: [Name, boolean, Term][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Term]])
      .reduce((x, y) => x.concat(y), []);
    const rest = s[s.length - 1];
    let body: [Term, boolean];
    if (rest.length === 1) {
      const h = rest[0];
      if (h.tag === 'List' && h.bracket === '{')
        body = expr(h)
      else body = [exprs(s[s.length - 1], '('), false];
    } else body = [exprs(s[s.length - 1], '('), false];
    const last = args[args.length - 1];
    const lastitem = Sigma(last[1], body[1], last[0], last[2], body[0]);
    return args.slice(0, -1).reduceRight((x, [name, impl, ty]) => Sigma(impl, false, name, ty, x), lastitem);
  }
  const jp = ts.findIndex(x => isName(x, ','));
  if (jp >= 0) {
    const s = splitTokens(ts, x => isName(x, ','));
    if (s.length < 2) return serr(`parsing failed with ,`);
    const args: [Term, boolean][] = s.map(x => {
      if (x.length === 1) {
        const h = x[0];
        if (h.tag === 'List' && h.bracket === '{')
          return expr(h)
      }
      return [exprs(x, '('), false];
    });
    if (args.length === 0) return serr(`empty pair`);
    if (args.length === 1) return serr(`singleton pair`);
    const last1 = args[args.length - 1];
    const last2 = args[args.length - 2];
    const lastitem = Pair(last2[1], last1[1], last2[0], last1[0]);
    return args.slice(0, -2).reduceRight((x, [y, p]) => Pair(p, false, y, x), lastitem);
  }
  const l = ts.findIndex(x => isName(x, '\\'));
  let all = [];
  if (l >= 0) {
    const first = ts.slice(0, l).map(expr);
    const rest = exprs(ts.slice(l), '(');
    all = first.concat([[rest, false]]);
  } else {
    all = ts.map(expr);
  }
  if (all.length === 0) return serr(`empty application`);
  if (all[0] && all[0][1]) return serr(`in application function cannot be between {}`);
  return all.slice(1).reduce((x, [y, impl]) => App(x, impl, y), all[0][0]);
};

export const parse = (s: string): Term => {
  const ts = tokenize(s);
  const ex = exprs(ts, '(');
  return ex;
};

export type ImportMap = { [key: string]: boolean };
export const parseDef = async (c: Token[], importMap: ImportMap): Promise<Def[]> => {
  if (c.length === 0) return [];
  if (c[0].tag === 'Name' && c[0].name === 'import') {
    const files = c.slice(1).map(t => {
      if (t.tag !== 'Name') return serr(`trying to import a non-path`);
      if (importMap[t.name]) {
        log(() => `skipping import ${t.name}`);
        return null;
      }
      return t.name;
    }).filter(x => x) as string[];
    log(() => `import ${files.join(' ')}`);
    const imps: string[] = await Promise.all(files.map(loadFile));
    const defs: Def[][] = await Promise.all(imps.map(s => parseDefs(s, importMap)));
    const fdefs = defs.reduce((x, y) => x.concat(y), []);
    fdefs.forEach(t => importMap[t.name] = true);
    log(() => `imported ${fdefs.map(x => x.name).join(' ')}`);
    return fdefs;
  } else if (c[0].tag === 'Name' && c[0].name === 'def') {
    if (c[1].tag === 'Name') {
      const name = c[1].name;
      const fst = 2;
      const sym = c[fst];
      if (sym.tag !== 'Name') return serr(`def: after name should be : or =`);
      if (sym.name === '=') {
        return [DDef(name, exprs(c.slice(fst + 1), '('))];
      } else if (sym.name === ':') {
        const tyts: Token[] = [];
        let j = fst + 1;
        for (; j < c.length; j++) {
          const v = c[j];
          if (v.tag === 'Name' && v.name === '=')
            break;
          else tyts.push(v);
        }
        const ety = exprs(tyts, '(');
        const body = exprs(c.slice(j + 1), '(');
        return [DDef(name, Let(false, name, ety, body, Var(name)))];
      } else return serr(`def: : or = expected but got ${sym.name}`);
    } else return serr(`def should start with a name`);
  } else return serr(`def should start with def or import`);
};

export const parseDefs = async (s: string, importMap: ImportMap): Promise<Def[]> => {
  const ts = tokenize(s);
  if (ts[0].tag !== 'Name' || (ts[0].name !== 'def' && ts[0].name !== 'import'))
    return serr(`def should start with "def" or "import"`);
  const spl = splitTokens(ts, t => t.tag === 'Name' && (t.name === 'def' || t.name === 'import'), true);
  const ds: Def[][] = await Promise.all(spl.map(s => parseDef(s, importMap)));
  return ds.reduce((x, y) => x.concat(y), []);
};
