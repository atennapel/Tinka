import { Term, Pi, Type, Let, Abs, App, Global, Var, showTerm, isUnsolved, showSurfaceZ, Fix, Roll, Unroll, Data, Con, Case, shift, showSurface } from './syntax';
import { EnvV, Val, showTermQ, VType, force, evaluate, extendV, VVar, quote, showEnvV, showTermS, zonk, VPi, VNe, HMeta, forceGlue, vapp } from './domain';
import { Nil, List, Cons, listToString, indexOf, mapIndex, filter, foldr, foldl } from './utils/list';
import { Ix, Name } from './names';
import { terr } from './utils/util';
import { unify } from './unify';
import { Plicity } from './surface';
import * as S from './surface';
import { log, config } from './config';
import { globalGet, globalSet } from './globalenv';
import { toCore, showTerm as showTermC } from './core/syntax';
import { typecheck as typecheckC } from './core/typecheck';
import * as CD from './core/domain';
import { freshMeta, freshMetaId, metaPush, metaDiscard, metaPop } from './metas';
import * as PD from './pure/domain';
import * as P from './pure/syntax';

type EntryT = { type: Val, bound: boolean, plicity: Plicity, inserted: boolean };
type EnvT = List<EntryT>;
const extendT = (ts: EnvT, val: Val, bound: boolean, plicity: Plicity, inserted: boolean): EnvT =>
  Cons({ type: val, bound, plicity, inserted }, ts);
const showEnvT = (ts: EnvT, k: Ix = 0, full: number = 0): string =>
  listToString(ts, entry => `${entry.bound ? '' : 'd '}${entry.plicity ? 'e ' : ''}${entry.inserted ? 'i ' : ''}${showTermQ(entry.type, k, full)}`);
const indexT = (ts: EnvT, ix: Ix): [EntryT, Ix] | null => {
  let l = ts;
  let i = 0;
  while (l.tag === 'Cons') {
    if (l.head.inserted) {
      l = l.tail;
      i++;
      continue;
    }
    if (ix === 0) return [l.head, i];
    i++;
    ix--;
    l = l.tail;
  }
  return null;
};

export interface Local {
  names: List<Name>;
  namesSurface: List<Name>;
  ts: EnvT;
  vs: EnvV;
  index: Ix;
  inType: boolean;
}
export const localEmpty: Local = { names: Nil, namesSurface: Nil, ts: Nil, vs: Nil, index: 0, inType: false };
export const extend = (l: Local, name: Name, ty: Val, bound: boolean, plicity: Plicity, inserted: boolean, val: Val, inType: boolean = l.inType): Local => ({
  names: Cons(name, l.names),
  namesSurface: inserted ? l.namesSurface : Cons(name, l.namesSurface),
  ts: extendT(l.ts, ty, bound, plicity, inserted),
  vs: extendV(l.vs, val),
  index: l.index + 1,
  inType,
});
export const localInType = (l: Local, inType: boolean = true): Local => ({
  names: l.names,
  namesSurface: l.namesSurface,
  ts: l.ts,
  vs: l.vs,
  index: l.index,
  inType,
});
export const showLocal = (l: Local, full: number = 0): string =>
  `Local(${l.index}, ${l.inType}, ${showEnvT(l.ts, l.index, full)}, ${showEnvV(l.vs, l.index, full)}, ${listToString(l.names)}, ${listToString(l.namesSurface)})`;

const newMeta = (ts: EnvT): Term => {
  const spine = filter(mapIndex(ts, (i, { bound }) => bound ? Var(i) : null), x => x !== null) as List<Var>;
  return foldr((x, y) => App(y, false, x), freshMeta() as Term, spine);
};

const inst = (ts: EnvT, vs: EnvV, ty_: Val): [Val, List<Term>] => {
  const ty = forceGlue(ty_);
  if (ty.tag === 'VPi' && ty.plicity) {
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [res, args] = inst(ts, vs, ty.body(vm));
    return [res, Cons(m, args)];
  }
  return [ty, Nil];
};

const check = (local: Local, tm: S.Term, ty: Val): Term => {
  log(() => `check ${S.showTerm(tm)} : ${showTermS(ty, local.names, local.index)}${config.showEnvs ? ` in ${showLocal(local)}` : ''}`);
  const fty = force(ty);
  if (tm.tag === 'Type' && fty.tag === 'VType') return Type;
  if (tm.tag === 'Hole') {
    const x = newMeta(local.ts);
    return x;
  }
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.plicity === fty.plicity) {
    const v = VVar(local.index);
    const x = tm.name === '_' ? fty.name : tm.name;
    const body = check(extend(local, x, fty.type, true, fty.plicity, false, v), tm.body, fty.body(v));
    return Abs(tm.plicity, x, quote(fty.type, local.index, 0), body);
  }
  if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && !tm.plicity && fty.plicity) {
    const v = VVar(local.index);
    const term = check(extend(local, fty.name, fty.type, true, true, true, v), tm, fty.body(v));
    return Abs(fty.plicity, fty.name, quote(fty.type, local.index, 0), term);
  }
  if (tm.tag === 'Let') {
    let vty;
    let val;
    let type;
    if (tm.type) {
      type = check(localInType(local), tm.type, VType);
      vty = evaluate(type, local.vs);
      val = check(local, tm.val, vty);
    } else {
      [val, vty] = synth(local, tm.val);
      type = quote(vty, local.index, 0);
    }
    const body = check(extend(local, tm.name, vty, false, tm.plicity, false, evaluate(val, local.vs)), tm.body, ty);
    return Let(tm.plicity, tm.name, type, val, body);
  }
  if (tm.tag === 'Roll' && !tm.type && fty.tag === 'VFix') {
    const term = check(local, tm.term, fty.body(ty));
    return Roll(quote(ty, local.index, 0), term);
  }
  const [term, ty2] = synth(local, tm);
  try {
    log(() => `unify ${showTermS(ty2, local.names, local.index)} ~ ${showTermS(ty, local.names, local.index)}`);
    metaPush();
    unify(local.index, ty2, ty);
    metaDiscard();
    return term;
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    try {
      metaPop();
      metaPush();
      const [ty2inst, ms] = inst(local.ts, local.vs, ty2); 
      log(() => `unify-inst ${showTermS(ty2inst, local.names, local.index)} ~ ${showTermS(ty, local.names, local.index)}`);
      unify(local.index, ty2inst, ty);
      metaDiscard();
      return foldl((a, m) => App(a, true, m), term, ms);
    } catch {
      if (!(err instanceof TypeError)) throw err;
      metaPop();
      return terr(`failed to unify ${showTermS(ty2, local.names, local.index)} ~ ${showTermS(ty, local.names, local.index)}: ${err.message}`);
    }
  }
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: Plicity): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(extendT(ts, va, true, impl, false));
  return VPi(impl, x, va, v => evaluate(b, extendV(vs, v)));
};

const synth = (local: Local, tm: S.Term): [Term, Val] => {
  log(() => `synth ${S.showTerm(tm)}${config.showEnvs ? ` in ${showLocal(local)}` : ''}`);
  if (tm.tag === 'Type') return [Type, VType];
  if (tm.tag === 'Var') {
    const i = indexOf(local.namesSurface, tm.name);
    if (i < 0) {
      const entry = globalGet(tm.name);
      if (!entry) return terr(`global ${tm.name} not found`);
      return [Global(tm.name), entry.type];
    } else {
      const [entry, j] = indexT(local.ts, i) || terr(`var out of scope ${S.showTerm(tm)}`);
      if (entry.plicity && !local.inType) return terr(`erased parameter ${S.showTerm(tm)} used`);
      return [Var(j), entry.type];
    }
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(local.ts);
    const vt = evaluate(newMeta(local.ts), local.vs);
    return [t, vt];
  }
  if (tm.tag === 'App') {
    const [left, ty] = synth(local, tm.left);
    const [right, rty, ms] = synthapp(local, ty, tm.plicity, tm.right, tm);
    return [App(foldl((f, a) => App(f, true, a), left, ms), tm.plicity, right), rty];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(localInType(local), tm.type, VType);
      const vtype = evaluate(type, local.vs);
      const [body, rt] = synth(extend(local, tm.name, vtype, true, tm.plicity, false, VVar(local.index)), tm.body);
      const pi = evaluate(Pi(tm.plicity, tm.name, type, quote(rt, local.index + 1, 0)), local.vs);
      return [Abs(tm.plicity, tm.name, type, body), pi];
    } else {
      const pi = freshPi(local.ts, local.vs, tm.name, tm.plicity);
      const term = check(local, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Let') {
    let vty;
    let val;
    let type;
    if (tm.type) {
      type = check(localInType(local), tm.type, VType);
      vty = evaluate(type, local.vs);
      val = check(local, tm.val, vty);
    } else {
      [val, vty] = synth(local, tm.val);
      type = quote(vty, local.index, 0);
    }
    const [body, rt] = synth(extend(local, tm.name, vty, false, tm.plicity, false, evaluate(val, local.vs)), tm.body);
    return [Let(tm.plicity, tm.name, type, val, body), rt];
  }
  if (tm.tag === 'Pi') {
    const type = check(localInType(local), tm.type, VType);
    const body = check(extend(local, tm.name, evaluate(type, local.vs), true, false, false, VVar(local.index)), tm.body, VType);
    return [Pi(tm.plicity, tm.name, type, body), VType];
  }
  if (tm.tag === 'Fix') {
    const type = check(localInType(local), tm.type, VType);
    const vt = evaluate(type, local.vs);
    const body = check(extend(local, tm.name, vt, true, false, false, VVar(local.index)), tm.body, vt);
    return [Fix(tm.name, type, body), vt];
  }
  if (tm.tag === 'Data') {
    const cons = tm.cons.map(t => check(extend(local, tm.name, VType, true, false, false, VVar(local.index)), t, VType));
    return [Data(tm.name, cons), VType];
  }
  if (tm.tag === 'Roll' && tm.type) {
    const type = check(localInType(local), tm.type, VType);
    const vt = evaluate(type, local.vs);
    const vtf = force(vt);
    if (vtf.tag === 'VFix') {
      const term = check(local, tm.term, vtf.body(vt));
      return [Roll(type, term), vt];
    }
    return terr(`fix type expected in ${S.showTerm(tm)}: ${showTermS(vt, local.names, local.index)}`);
  }
  if (tm.tag === 'Unroll') {
    const [term, ty] = synth(local, tm.term);
    const vt = force(ty);
    if (vt.tag === 'VFix') return [Unroll(term), vt.body(ty)];
    return terr(`fix type expected in ${S.showTerm(tm)}: ${showTermS(vt, local.names, local.index)}`);
  }
  if (tm.tag === 'Ann') {
    const type = check(localInType(local), tm.type, VType);
    const vtype = evaluate(type, local.vs);
    const term = check(local, tm.term, vtype);
    return [Let(false, 'x', type, term, Var(0)), vtype];
  }
  if (tm.tag === 'Con' && tm.type) {
    const type = check(localInType(local), tm.type, VType);
    const vtype = evaluate(type, local.vs);
    const ft = force(vtype);
    if (ft.tag !== 'VData') return terr(`not a datatype in con: ${S.showTerm(tm)}`);
    if (ft.cons.length !== tm.total) return terr(`cons amount mismatch: ${S.showTerm(tm)}`);
    if (!ft.cons[tm.index]) return terr(`not a valid constructor: ${S.showTerm(tm)}`);
    const con = ft.cons[tm.index](vtype);
    const [args, rt] = synthconargs(local, con, tm.args);
    if (force(rt).tag !== 'VData') return terr(`constructor was not fully applied: ${S.showTerm(tm)}`);
    return [Con(type, tm.index, tm.total, args), rt];
  }
  if (tm.tag === 'Case') {
    const type = check(localInType(local), tm.type, VType);
    const vtype = evaluate(type, local.vs);
    const ft = force(vtype);
    if (ft.tag !== 'VData') return terr(`not a datatype in case: ${S.showTerm(tm)}`);
    if (ft.cons.length !== tm.cases.length) return terr(`cases length mismatch: ${S.showTerm(tm)}`);
    const prop = check(localInType(local), tm.prop, VPi(false, '_', vtype, _ => VType));
    const vprop = evaluate(prop, local.vs);
    const scrut = check(local, tm.scrut, vtype);
    const vscrut = evaluate(scrut, local.vs);
    const types = ft.cons.map((c, i) => makeBranch(local.index, local.index, type, prop, i, ft.cons.length, c(vtype)));
    log(() => types.map(x => showTerm(x)).join(' ; '));
    log(() => types.map(x => showSurface(x, local.names)).join(' ; '));
    const cases = tm.cases.map((t, i) => check(local, t, evaluate(types[i], local.vs)));
    return [Case(type, prop, scrut, cases), vapp(vprop, false, vscrut)];
  }
  return terr(`cannot synth ${S.showTerm(tm)}`);
};

const makeBranch = (k: Ix, ok: Ix, type: Term, prop: Term, i: Ix, total: number, v_: Val, args: [Ix, Plicity][] = [], argcount: number = 0): Term => {
  const v = force(v_);
  if (v.tag === 'VData')
    return App(shift(argcount, 0, prop), false, Con(shift(argcount, 0, type), i, total, args.map(([x, p]) => [Var(k - x - 1), p])));
  if (v.tag === 'VPi')
    return Pi(v.plicity, makeName(v.name, argcount), quote(v.type, k, 0),
      makeBranch(k + 1, ok, type, prop, i, total, v.body(VVar(k)), args.concat([[k, v.plicity]]), argcount + 1));
  return terr(`unexpected type in makeBranch: ${v.tag}`);
};
const makeName = (x: Name, i: Ix): Name => x === '_' ? `a${i}` : x;

const synthconargs = (local: Local, ty_: Val, args: [S.Term, Plicity][]): [[Term, Plicity][], Val] => {
  log(() => `synthconargs ${showTermS(ty_, local.names, local.index)} @ [${args.map(([t, p]) => `${p ? '-' : ''}${S.showTerm(t)}`).join(' ')}]${config.showEnvs ? ` in ${showLocal(local)}` : ''}`);
  if (args.length === 0) return [[], ty_];
  const ty = force(ty_);
  const head = args[0];
  if (ty.tag === 'VPi' && ty.plicity === head[1]) {
    const arg = check(ty.plicity ? localInType(local) : local, head[0], ty.type);
    const rt = ty.body(evaluate(arg, local.vs));
    const rest = synthconargs(local, rt, args.slice(1));
    return [[[arg, head[1]] as [Term, Plicity]].concat(rest[0]), rest[1]];
  }
  return terr(`invalid type or plicity mismatch in synthconargs`);
};

const synthapp = (local: Local, ty_: Val, plicity: Plicity, tm: S.Term, tmall: S.Term): [Term, Val, List<Term>] => {
  log(() => `synthapp ${showTermS(ty_, local.names, local.index)} ${plicity ? '-' : ''}@ ${S.showTerm(tm)}${config.showEnvs ? ` in ${showLocal(local)}` : ''}`);
  const ty = force(ty_);
  // TODO: case where ty.tag === 'VFix', insert unroll
  if (ty.tag === 'VPi' && ty.plicity && !plicity) {
    const m = newMeta(local.ts);
    const vm = evaluate(m, local.vs);
    const [rest, rt, l] = synthapp(local, ty.body(vm), plicity, tm, tmall);
    return [rest, rt, Cons(m, l)];
  }
  if (ty.tag === 'VPi' && ty.plicity === plicity) {
    const right = check(plicity ? localInType(local) : local, tm, ty.type);
    const rt = ty.body(evaluate(right, local.vs));
    return [right, rt, Nil];
  }
  // TODO fix the following
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi(plicity, '_', VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(local.index, ty, pi);
    return synthapp(local, pi, plicity, tm, tmall);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${S.showTerm(tmall)}: ${showTermQ(ty, local.index)} ${plicity ? '-' : ''}@ ${S.showTerm(tm)}`);
};

export const typecheck = (tm: S.Term, local: Local = localEmpty): [Term, Val] => {
  const [etm, ty] = synth(local, tm);
  const ztm = zonk(etm, local.vs, local.index);
  if (isUnsolved(ztm))
    return terr(`elaborated term was unsolved: ${showSurfaceZ(ztm)}`);
  return [ztm, ty];
};

export const typecheckDefs = (ds: S.Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef' && globalGet(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `typecheckDefs ${S.showDef(d)}`);
    if (d.tag === 'DDef') {
      const [tm_, ty] = typecheck(d.value);
      const tm = zonk(tm_);
      log(() => `set ${d.name} = ${showTerm(tm)}`);
      const zty = quote(ty, 0, 0);
      const ctm = toCore(tm);
      if (config.checkCore) {
        log(() => `typecheck in core: ${showTermC(ctm)}`);
        const cty = typecheckC(ctm);
        log(() => `core type: ${showTermC(CD.quote(cty, 0, false))}`);
        globalSet(d.name, tm, evaluate(tm, Nil), ty, ctm, CD.evaluate(ctm, Nil), cty, PD.normalize(P.erase(ctm)));
      } else {
        globalSet(d.name, tm, evaluate(tm, Nil), ty, ctm, CD.evaluate(ctm, Nil), CD.evaluate(toCore(zty), Nil), PD.normalize(P.erase(ctm)));
      }
      xs.push(d.name);
    }
  }
  return xs;
};
