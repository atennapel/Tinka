import { Core } from './core';
import { Mode } from './mode';
import { chooseName, Ix, Lvl, Name } from './names';
import { many, Usage } from './usage';
import { cons, List, nil } from './utils/List';
import { impossible } from './utils/utils';
import { quote, Val } from './values';

export type Surface =
  Var | Let | Hole |
  Type |
  Pi | Abs | App |
  Sigma | Pair | ElimSigma | Proj |
  Signature | Module | Import |
  PropEq | Refl | ElimPropEq |
  Nat | NatLit | NatS | ElimNat |
  Fin;

export interface Var { readonly tag: 'Var'; readonly name: Name }
export const Var = (name: Name): Var => ({ tag: 'Var', name });
export interface Let { readonly tag: 'Let'; readonly usage: Usage; readonly name: Name; readonly type: Surface | null; readonly val: Surface; readonly body: Surface }
export const Let = (usage: Usage, name: Name, type: Surface | null, val: Surface, body: Surface): Let => ({ tag: 'Let', usage, name, type, val, body });
export interface Type { readonly tag: 'Type' }
export const Type: Type = { tag: 'Type' };
export interface Pi { readonly tag: 'Pi'; readonly usage: Usage; readonly mode: Mode; readonly name: Name; readonly type: Surface; readonly body: Surface }
export const Pi = (usage: Usage, mode: Mode, name: Name, type: Surface, body: Surface): Pi =>
  ({ tag: 'Pi', usage, mode, name, type, body });
export interface Abs { readonly tag: 'Abs'; readonly usage: Usage; readonly mode: Mode; readonly name: Name; readonly type: Surface | null; readonly body: Surface }
export const Abs = (usage: Usage, mode: Mode, name: Name, type: Surface | null, body: Surface): Abs =>
  ({ tag: 'Abs', usage, mode, name, type, body });
export interface App { readonly tag: 'App'; readonly fn: Surface; readonly mode: Mode; readonly arg: Surface }
export const App = (fn: Surface, mode: Mode, arg: Surface): App => ({ tag: 'App', fn, mode, arg });
export interface Sigma { readonly tag: 'Sigma'; readonly usage: Usage; readonly name: Name; readonly type: Surface; readonly body: Surface }
export const Sigma = (usage: Usage, name: Name, type: Surface, body: Surface): Sigma => ({ tag: 'Sigma', usage, name, type, body });
export interface Pair { readonly tag: 'Pair'; readonly fst: Surface; readonly snd: Surface }
export const Pair = (fst: Surface, snd: Surface): Pair => ({ tag: 'Pair', fst, snd });
export interface ElimSigma { readonly tag: 'ElimSigma'; readonly usage: Usage; readonly motive: Surface; readonly scrut: Surface, readonly cas: Surface }
export const ElimSigma = (usage: Usage, motive: Surface, scrut: Surface, cas: Surface): ElimSigma => ({ tag: 'ElimSigma', usage, motive, scrut, cas });
export interface Proj { readonly tag: 'Proj'; readonly term: Surface; readonly proj: ProjType }
export const Proj = (term: Surface, proj: ProjType): Proj => ({ tag: 'Proj', term, proj });
export interface Import { readonly tag: 'Import'; readonly term: Surface; readonly imports: string[] | null; readonly body: Surface }
export const Import = (term: Surface, imports: string[] | null, body: Surface): Import => ({ tag: 'Import', term, imports, body });
export interface SigEntry { readonly usage: Usage; readonly name: Name; readonly type: Surface | null }
export const SigEntry = (usage: Usage, name: Name, type: Surface | null): SigEntry => ({ usage, name, type });
export interface Signature { readonly tag: 'Signature'; readonly defs: SigEntry[] }
export const Signature = (defs: SigEntry[]): Signature => ({ tag: 'Signature', defs });
export interface ModEntry { readonly priv: boolean; readonly usage: Usage; readonly name: Name; readonly type: Surface | null; readonly val: Surface }
export const ModEntry = (priv: boolean, usage: Usage, name: Name, type: Surface | null, val: Surface): ModEntry => ({ priv, usage, name, type, val });
export interface Module { readonly tag: 'Module'; readonly defs: ModEntry[] }
export const Module = (defs: ModEntry[]): Module => ({ tag: 'Module', defs });
export interface PropEq { readonly tag: 'PropEq'; readonly type: Surface | null; readonly left: Surface; readonly right: Surface }
export const PropEq = (type: Surface | null, left: Surface, right: Surface): PropEq => ({ tag: 'PropEq', type, left, right });
export interface Refl { readonly tag: 'Refl'; readonly type: Surface | null; readonly val: Surface | null };
export const Refl = (type: Surface | null, val: Surface | null): Refl => ({ tag: 'Refl', type, val });
export interface ElimPropEq { readonly tag: 'ElimPropEq'; readonly usage: Usage; readonly motive: Surface; readonly scrut: Surface, readonly cas: Surface }
export const ElimPropEq = (usage: Usage, motive: Surface, scrut: Surface, cas: Surface): ElimPropEq => ({ tag: 'ElimPropEq', usage, motive, scrut, cas });
export interface Hole { readonly tag: 'Hole'; readonly name: Name | null }
export const Hole = (name: Name | null): Hole => ({ tag: 'Hole', name });
export interface Nat { readonly tag: 'Nat' }
export const Nat: Nat = { tag: 'Nat' };
export interface NatLit { readonly tag: 'NatLit'; readonly value: bigint }
export const NatLit = (value: bigint): NatLit => ({ tag: 'NatLit', value });
export interface NatS { readonly tag: 'NatS'; readonly term: Surface }
export const NatS = (term: Surface): NatS => ({ tag: 'NatS', term });
export interface ElimNat { readonly tag: 'ElimNat'; readonly usage: Usage; readonly motive: Surface; readonly scrut: Surface, readonly z: Surface; readonly s: Surface }
export const ElimNat = (usage: Usage, motive: Surface, scrut: Surface, z: Surface, s: Surface): ElimNat => ({ tag: 'ElimNat', usage, motive, scrut, z, s });
export interface Fin { readonly tag: 'Fin'; readonly index: Surface }
export const Fin = (index: Surface): Fin => ({ tag: 'Fin', index });

export type ProjType = PProj | PName | PIndex;

export interface PProj { readonly tag: 'PProj'; readonly proj: 'fst' | 'snd' }
export const PProj = (proj: 'fst' | 'snd'): PProj => ({ tag: 'PProj', proj });
export const PFst = PProj('fst');
export const PSnd = PProj('snd');
export interface PName { readonly tag: 'PName'; readonly name: Name }
export const PName = (name: Name): PName => ({ tag: 'PName', name });
export interface PIndex { readonly tag: 'PIndex'; readonly index: Ix }
export const PIndex = (index: Ix): PIndex => ({ tag: 'PIndex', index });

export const flattenPi = (t: Surface): [[Usage, Mode, Name, Surface][], Surface] => {
  const params: [Usage, Mode, Name, Surface][] = [];
  let c = t;  
  while (c.tag === 'Pi') {
    params.push([c.usage, c.mode, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenAbs = (t: Surface): [[Usage, Mode, Name, Surface | null][], Surface] => {
  const params: [Usage, Mode, Name, Surface | null][] = [];
  let c = t;  
  while (c.tag === 'Abs') {
    params.push([c.usage, c.mode, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenApp = (t: Surface): [Surface, [Mode, Surface][]] => {
  const args: [Mode, Surface][] = [];
  let c = t;  
  while (c.tag === 'App') {
    args.push([c.mode, c.arg]);
    c = c.fn;
  }
  return [c, args.reverse()];
};
export const flattenSigma = (t: Surface): [[Usage, Name, Surface][], Surface] => {
  const params: [Usage, Name, Surface][] = [];
  let c = t;  
  while (c.tag === 'Sigma') {
    params.push([c.usage, c.name, c.type]);
    c = c.body;
  }
  return [params, c];
};
export const flattenPair = (t: Surface): Surface[] => {
  const r: Surface[] = [];
  while (t.tag === 'Pair') {
    r.push(t.fst);
    t = t.snd;
  }
  r.push(t);
  return r;
};
export const flattenProj = (t: Surface): [Surface, ProjType[]] => {
  const r: ProjType[] = [];
  while (t.tag === 'Proj') {
    r.push(t.proj);
    t = t.term;
  }
  return [t, r.reverse()];
};

const showP = (b: boolean, t: Surface) => b ? `(${show(t)})` : show(t);
const isSimple = (t: Surface) => t.tag === 'Type' || t.tag === 'Var' || t.tag === 'Proj' || t.tag === 'Hole' || t.tag === 'Nat' || t.tag === 'NatLit';
const showS = (t: Surface) => showP(!isSimple(t), t);
const showProjType = (p: ProjType): string => {
  if (p.tag === 'PProj') return p.proj === 'fst' ? '_1' : '_2';
  if (p.tag === 'PName') return `${p.name}`;
  if (p.tag === 'PIndex') return `${p.index}`;
  return p;
};
export const show = (t: Surface): string => {
  if (t.tag === 'Type') return 'Type';
  if (t.tag === 'Nat') return 'Nat';
  if (t.tag === 'NatLit') return `${t.value}`;
  if (t.tag === 'Var') return `${t.name}`;
  if (t.tag === 'Hole') return `_${t.name || ''}`;
  if (t.tag === 'Pi') {
    const [params, ret] = flattenPi(t);
    return `${params.map(([u, m, x, t]) => u === many && m.tag === 'Expl' && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Let', t) : `${m.tag === 'Expl' ? '(' : '{'}${u === many ? '' : `${u} `}${x} : ${show(t)}${m.tag === 'Expl' ? ')' : '}'}`).join(' -> ')} -> ${show(ret)}`;
  }
  if (t.tag === 'Abs') {
    const [params, body] = flattenAbs(t);
    return `\\${params.map(([u, m, x, t]) => u === many && m.tag === 'Expl' && !t ? x : `${m.tag === 'Expl' ? '(' : '{'}${u === many ? '' : `${u} `}${x}${t ? ` : ${show(t)}` : ''}${m.tag === 'Expl' ? ')' : '}'}`).join(' ')}. ${show(body)}`;
  }
  if (t.tag === 'App') {
    const [fn, args] = flattenApp(t);
    return `${showS(fn)} ${args.map(([m, a]) => m.tag === 'Expl' ? showS(a) : `{${show(a)}}`).join(' ')}`;
  }
  if (t.tag === 'Let')
    return `let ${t.usage === many ? '' : `${t.usage} `}${t.name}${t.type ? ` : ${showP(t.type.tag === 'Let', t.type)}` : ''} = ${showP(t.val.tag === 'Let', t.val)}; ${show(t.body)}`;
  if (t.tag === 'Import')
    return `import ${showS(t.term)}${t.imports ? ` (${t.imports.join(', ')})` : ''}; ${show(t.body)}`
  if (t.tag === 'Sigma') {
    const [params, ret] = flattenSigma(t);
    return `${params.map(([u, x, t]) => u === many && x === '_' ? showP(t.tag === 'Pi' || t.tag === 'Sigma' || t.tag === 'Let', t) : `(${u === many ? '' : `${u} `}${x} : ${show(t)})`).join(' ** ')} ** ${show(ret)}`;
  }
  if (t.tag === 'Pair') {
    const ps = flattenPair(t);
    return `(${ps.map(show).join(', ')})`;
  }
  if (t.tag === 'ElimSigma')
    return `elimSigma ${t.usage === many ? '' : `${t.usage} `}${showS(t.motive)} ${showS(t.scrut)} ${showS(t.cas)}`;
  if (t.tag === 'Proj') {
    const [hd, ps] = flattenProj(t);
    return `${showS(hd)}.${ps.map(showProjType).join('.')}`;
  }
  if (t.tag === 'Signature')
    return `sig { ${t.defs.map(({usage, name, type}) => `def ${usage === many ? '' : `${usage} `}${name}${type ? ` : ${show(type)}` : ''}`).join(' ')} }`;
  if (t.tag === 'Module')
    return `mod { ${t.defs.map(({priv, usage, name, type, val}) =>
      `${priv ? 'private ' : ''}def ${usage === many ? '' : `${usage} `}${name}${type ? ` : ${show(type)}` : ''} = ${show(val)}`).join(' ')} }`;
  if (t.tag === 'PropEq')
    return `${t.type ? `{${show(t.type)}} ` : ''}${show(t.left)} = ${show(t.right)}`;
  if (t.tag === 'Refl') return `Refl${t.type ? ` {${show(t.type)}}` : ''}${t.val ? ` {${show(t.val)}}` : ''}`;
  if (t.tag === 'ElimPropEq')
    return `elimPropEq ${t.usage === many ? '' : `${t.usage} `}${showS(t.motive)} ${showS(t.scrut)} ${showS(t.cas)}`;
  if (t.tag === 'NatS')
    return `S ${showS(t.term)}`;
  if (t.tag === 'ElimNat')
    return `elimNat ${t.usage === many ? '' : `${t.usage} `}${showS(t.motive)} ${showS(t.scrut)} ${showS(t.z)} ${showS(t.s)}`;
  if (t.tag === 'Fin') return `Fin ${showS(t.index)}`;
  return t;
};

export const fromCore = (t: Core, ns: List<Name> = nil): Surface => {
  if (t.tag === 'Type') return Type;
  if (t.tag === 'Nat') return Nat;
  if (t.tag === 'Var') return Var(ns.index(t.index) || impossible(`var out of scope in fromCore: ${t.index}`));
  if (t.tag === 'Global') return Var(t.name);
  if (t.tag === 'App') return App(fromCore(t.fn, ns), t.mode, fromCore(t.arg, ns));
  if (t.tag === 'Pi') {
    const x = chooseName(t.name, ns);
    return Pi(t.usage, t.mode, x, fromCore(t.type, ns), fromCore(t.body, cons(x, ns)));
  }
  if (t.tag === 'Abs') {
    const x = chooseName(t.name, ns);
    return Abs(t.usage, t.mode, x, fromCore(t.type, ns), fromCore(t.body, cons(x, ns)));
  }
  if (t.tag === 'Let') {
    const x = chooseName(t.name, ns);
    return Let(t.usage, x, fromCore(t.type, ns), fromCore(t.val, ns), fromCore(t.body, cons(x, ns)));
  }
  if (t.tag === 'Sigma') {
    const x = chooseName(t.name, ns);
    return Sigma(t.usage, x, fromCore(t.type, ns), fromCore(t.body, cons(x, ns)));
  }
  if (t.tag === 'Pair') return Pair(fromCore(t.fst, ns), fromCore(t.snd, ns));
  if (t.tag === 'ElimSigma') return ElimSigma(t.usage, fromCore(t.motive, ns), fromCore(t.scrut, ns), fromCore(t.cas, ns));
  if (t.tag === 'ElimPropEq') return ElimPropEq(t.usage, fromCore(t.motive, ns), fromCore(t.scrut, ns), fromCore(t.cas, ns));
  if (t.tag === 'Proj') return Proj(fromCore(t.term, ns), t.proj.tag === 'PProj' ? t.proj : t.proj.name ? PName(t.proj.name) : PIndex(t.proj.index));
  if (t.tag === 'PropEq') return PropEq(fromCore(t.type, ns), fromCore(t.left, ns), fromCore(t.right, ns));
  if (t.tag === 'Refl') return Refl(fromCore(t.type, ns), fromCore(t.val, ns));
  if (t.tag === 'NatS') return NatS(fromCore(t.term, ns));
  if (t.tag === 'ElimNat') return ElimNat(t.usage, fromCore(t.motive, ns), fromCore(t.scrut, ns), fromCore(t.z, ns), fromCore(t.s, ns));
  if (t.tag === 'Fin') return Fin(fromCore(t.index, ns));
  return t;
};

export const showCore = (t: Core, ns: List<Name> = nil): string => show(fromCore(t, ns));
export const showVal = (v: Val, k: Lvl = 0, ns: List<Name> = nil): string => show(fromCore(quote(v, k), ns));
