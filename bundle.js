(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.setConfig = exports.config = void 0;
exports.config = {
    debug: false,
    showEnvs: false,
    showNormalization: true,
    verify: false,
};
exports.setConfig = (c) => {
    for (let k in c)
        exports.config[k] = c[k];
};
exports.log = (msg) => {
    if (exports.config.debug)
        console.log(msg());
};

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conv = exports.eqHead = void 0;
const utils_1 = require("./utils/utils");
const domain_1 = require("./domain");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const config_1 = require("./config");
exports.eqHead = (a, b) => {
    if (a === b)
        return true;
    if (a.tag === 'HVar')
        return b.tag === 'HVar' && a.index === b.index;
    if (a.tag === 'HGlobal')
        return b.tag === 'HGlobal' && a.name === b.name;
    if (a.tag === 'HMeta')
        return b.tag === 'HMeta' && a.index === b.index;
    return a;
};
const convElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.plicity === b.plicity)
        return exports.conv(k, a.arg, b.arg);
    if (a.tag === 'EUnsafeCast' && b.tag === 'EUnsafeCast')
        return exports.conv(k, a.type, b.type);
    if (a.tag === 'EFst' && b.tag === 'EFst')
        return;
    if (a.tag === 'ESnd' && b.tag === 'ESnd')
        return;
    return utils_1.terr(`conv failed (${k}): ${domain_1.showTermQ(x, k)} ~ ${domain_1.showTermQ(y, k)}`);
};
exports.conv = (k, a_, b_) => {
    const a = domain_1.forceGlue(a_);
    const b = domain_1.forceGlue(b_);
    config_1.log(() => `conv(${k}) ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VSort' && b.tag === 'VSort' && a.sort === b.sort)
        return;
    if (a.tag === 'VEnum' && b.tag === 'VEnum' && a.num === b.num)
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.plicity === b.plicity) {
        exports.conv(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.conv(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma') {
        exports.conv(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.conv(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.conv(k, a.fst, b.fst);
        exports.conv(k, a.snd, b.snd);
        return exports.conv(k, a.type, b.type);
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.plicity === b.plicity) {
        exports.conv(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.conv(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.conv(k + 1, a.body(v), domain_1.vapp(b, a.plicity, v));
    }
    if (b.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.conv(k + 1, domain_1.vapp(a, b.plicity, v), b.body(v));
    }
    if (a.tag === 'VPair') {
        exports.conv(k, a.fst, domain_1.vfst(b));
        return exports.conv(k, a.snd, domain_1.vsnd(b));
    }
    if (b.tag === 'VPair') {
        exports.conv(k, domain_1.vfst(a), b.fst);
        return exports.conv(k, domain_1.vsnd(a), b.snd);
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && exports.eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args))
        return list_1.zipWithR_((x, y) => convElim(k, x, y, a, b), a.args, b.args);
    if (a.tag === 'VGlued' && b.tag === 'VGlued' && exports.eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args)) {
        try {
            return list_1.zipWithR_((x, y) => convElim(k, x, y, a, b), a.args, b.args);
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            return exports.conv(k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        }
    }
    if (a.tag === 'VGlued')
        return exports.conv(k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlued')
        return exports.conv(k, a, lazy_1.forceLazy(b.val));
    return utils_1.terr(`conv failed (${k}): ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
};

},{"./config":1,"./domain":3,"./utils/lazy":13,"./utils/list":14,"./utils/utils":15}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zonk = exports.showElim = exports.showElimQ = exports.showTermSZ = exports.showTermS = exports.showTermQZ = exports.showTermQ = exports.normalize = exports.quoteZ = exports.quote = exports.evaluate = exports.vsnd = exports.vfst = exports.vunsafecast = exports.vapp = exports.forceGlue = exports.force = exports.showEnvV = exports.extendV = exports.VMeta = exports.VGlobal = exports.VVar = exports.VType = exports.VEnum = exports.VPair = exports.VSort = exports.VSigma = exports.VPi = exports.VAbs = exports.VGlued = exports.VNe = exports.ESnd = exports.EFst = exports.EUnsafeCast = exports.EApp = exports.HMeta = exports.HGlobal = exports.HVar = void 0;
const list_1 = require("./utils/list");
const syntax_1 = require("./syntax");
const utils_1 = require("./utils/utils");
const lazy_1 = require("./utils/lazy");
const globalenv_1 = require("./globalenv");
const metas_1 = require("./metas");
exports.HVar = (index) => ({ tag: 'HVar', index });
exports.HGlobal = (name) => ({ tag: 'HGlobal', name });
exports.HMeta = (index) => ({ tag: 'HMeta', index });
exports.EApp = (plicity, arg) => ({ tag: 'EApp', plicity, arg });
exports.EUnsafeCast = (type) => ({ tag: 'EUnsafeCast', type });
exports.EFst = { tag: 'EFst' };
exports.ESnd = { tag: 'ESnd' };
exports.VNe = (head, args) => ({ tag: 'VNe', head, args });
exports.VGlued = (head, args, val) => ({ tag: 'VGlued', head, args, val });
exports.VAbs = (plicity, name, type, body) => ({ tag: 'VAbs', plicity, name, type, body });
exports.VPi = (plicity, name, type, body) => ({ tag: 'VPi', plicity, name, type, body });
exports.VSigma = (name, type, body) => ({ tag: 'VSigma', name, type, body });
exports.VSort = (sort) => ({ tag: 'VSort', sort });
exports.VPair = (fst, snd, type) => ({ tag: 'VPair', fst, snd, type });
exports.VEnum = (num) => ({ tag: 'VEnum', num });
exports.VType = exports.VSort('*');
exports.VVar = (index) => exports.VNe(exports.HVar(index), list_1.Nil);
exports.VGlobal = (name) => exports.VNe(exports.HGlobal(name), list_1.Nil);
exports.VMeta = (index) => exports.VNe(exports.HMeta(index), list_1.Nil);
exports.extendV = (vs, val) => list_1.Cons(val, vs);
exports.showEnvV = (l, k = 0, full = false) => list_1.listToString(l, v => syntax_1.showTerm(exports.quote(v, k, full)));
exports.force = (v) => {
    if (v.tag === 'VGlued')
        return exports.force(lazy_1.forceLazy(v.val));
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.metaGet(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((elim, y) => elim.tag === 'EUnsafeCast' ? exports.vunsafecast(elim.type, y) :
            elim.tag === 'EFst' ? exports.vfst(y) :
                elim.tag === 'ESnd' ? exports.vsnd(y) :
                    exports.vapp(y, elim.plicity, elim.arg), val.val, v.args));
    }
    return v;
};
exports.forceGlue = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.metaGet(v.head.index);
        if (val.tag === 'Unsolved')
            return v;
        return exports.forceGlue(list_1.foldr((elim, y) => elim.tag === 'EUnsafeCast' ? exports.vunsafecast(elim.type, y) :
            elim.tag === 'EFst' ? exports.vfst(y) :
                elim.tag === 'ESnd' ? exports.vsnd(y) :
                    exports.vapp(y, elim.plicity, elim.arg), val.val, v.args));
    }
    return v;
};
// do the eliminators have to force?
exports.vapp = (a, plicity, b) => {
    if (a.tag === 'VAbs') {
        if (a.plicity !== plicity)
            return utils_1.impossible(`plicity mismatch in vapp`);
        return a.body(b);
    }
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons(exports.EApp(plicity, b), a.args));
    if (a.tag === 'VGlued')
        return exports.VGlued(a.head, list_1.Cons(exports.EApp(plicity, b), a.args), lazy_1.mapLazy(a.val, v => exports.vapp(v, plicity, b)));
    return utils_1.impossible(`vapp: ${a.tag}`);
};
exports.vunsafecast = (type, v) => {
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EUnsafeCast(type), v.args));
    if (v.tag === 'VGlued')
        return exports.VGlued(v.head, list_1.Cons(exports.EUnsafeCast(type), v.args), lazy_1.mapLazy(v.val, v => exports.vunsafecast(type, v)));
    return v;
};
exports.vfst = (v) => {
    if (v.tag === 'VPair')
        return v.fst;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.EFst, v.args));
    if (v.tag === 'VGlued')
        return exports.VGlued(v.head, list_1.Cons(exports.EFst, v.args), lazy_1.mapLazy(v.val, v => exports.vfst(v)));
    return utils_1.impossible(`vfst: ${v.tag}`);
};
exports.vsnd = (v) => {
    if (v.tag === 'VPair')
        return v.snd;
    if (v.tag === 'VNe')
        return exports.VNe(v.head, list_1.Cons(exports.ESnd, v.args));
    if (v.tag === 'VGlued')
        return exports.VGlued(v.head, list_1.Cons(exports.ESnd, v.args), lazy_1.mapLazy(v.val, v => exports.vsnd(v)));
    return utils_1.impossible(`vsnd: ${v.tag}`);
};
exports.evaluate = (t, vs = list_1.Nil) => {
    if (t.tag === 'Sort')
        return exports.VSort(t.sort);
    if (t.tag === 'Var') {
        const val = list_1.index(vs, t.index) || utils_1.impossible(`evaluate: var ${t.index} has no value`);
        // TODO: return VGlued(HVar(length(vs) - t.index - 1), Nil, lazyOf(val));
        return val;
    }
    if (t.tag === 'Meta') {
        const s = metas_1.metaGet(t.index);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.index);
    }
    if (t.tag === 'Global') {
        const entry = globalenv_1.globalGet(t.name) || utils_1.impossible(`evaluate: global ${t.name} has no value`);
        return exports.VGlued(exports.HGlobal(t.name), list_1.Nil, lazy_1.lazyOf(entry.val));
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), t.plicity, exports.evaluate(t.right, vs));
    if (t.tag === 'Abs')
        return exports.VAbs(t.plicity, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, exports.extendV(vs, exports.evaluate(t.val, vs)));
    if (t.tag === 'Pi')
        return exports.VPi(t.plicity, t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'Sigma')
        return exports.VSigma(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, v)));
    if (t.tag === 'UnsafeCast')
        return exports.vunsafecast(exports.evaluate(t.type, vs), exports.evaluate(t.val, vs));
    if (t.tag === 'Pair')
        return exports.VPair(exports.evaluate(t.fst, vs), exports.evaluate(t.snd, vs), exports.evaluate(t.type, vs));
    if (t.tag === 'Fst')
        return exports.vfst(exports.evaluate(t.term, vs));
    if (t.tag === 'Snd')
        return exports.vsnd(exports.evaluate(t.term, vs));
    if (t.tag === 'Enum')
        return exports.VEnum(t.num);
    return t;
};
const quoteHead = (h, k) => {
    if (h.tag === 'HVar')
        return syntax_1.Var(k - (h.index + 1));
    if (h.tag === 'HGlobal')
        return syntax_1.Global(h.name);
    if (h.tag === 'HMeta')
        return syntax_1.Meta(h.index);
    return h;
};
const quoteHeadGlued = (h, k) => {
    if (h.tag === 'HGlobal')
        return syntax_1.Global(h.name);
    if (h.tag === 'HMeta')
        return syntax_1.Meta(h.index);
    return null;
};
const quoteElim = (t, e, k, full) => {
    if (e.tag === 'EApp')
        return syntax_1.App(t, e.plicity, exports.quote(e.arg, k, full));
    if (e.tag === 'EUnsafeCast')
        return syntax_1.UnsafeCast(exports.quote(e.type, k, full), t);
    if (e.tag === 'EFst')
        return syntax_1.Fst(t);
    if (e.tag === 'ESnd')
        return syntax_1.Snd(t);
    return e;
};
exports.quote = (v_, k, full) => {
    const v = exports.forceGlue(v_);
    if (v.tag === 'VSort')
        return syntax_1.Sort(v.sort);
    if (v.tag === 'VNe')
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), quoteHead(v.head, k), v.args);
    if (v.tag === 'VGlued') {
        if (full)
            return exports.quote(lazy_1.forceLazy(v.val), k, full);
        const head = quoteHeadGlued(v.head, k);
        if (!head)
            return exports.quote(lazy_1.forceLazy(v.val), k, full);
        return list_1.foldr((x, y) => quoteElim(y, x, k, full), head, v.args);
    }
    if (v.tag === 'VAbs')
        return syntax_1.Abs(v.plicity, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPi')
        return syntax_1.Pi(v.plicity, v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VSigma')
        return syntax_1.Sigma(v.name, exports.quote(v.type, k, full), exports.quote(v.body(exports.VVar(k)), k + 1, full));
    if (v.tag === 'VPair')
        return syntax_1.Pair(exports.quote(v.fst, k, full), exports.quote(v.snd, k, full), exports.quote(v.type, k, full));
    if (v.tag === 'VEnum')
        return syntax_1.Enum(v.num);
    return v;
};
exports.quoteZ = (v, vs = list_1.Nil, k = 0, full = false) => exports.zonk(exports.quote(v, k, full), vs, k, full);
exports.normalize = (t, vs, k, full) => exports.quote(exports.evaluate(t, vs), k, full);
exports.showTermQ = (v, k = 0, full = false) => syntax_1.showTerm(exports.quote(v, k, full));
exports.showTermQZ = (v, vs = list_1.Nil, k = 0, full = false) => syntax_1.showTerm(exports.quoteZ(v, vs, k, full));
exports.showTermS = (v, ns = list_1.Nil, k = 0, full = false) => syntax_1.showSurface(exports.quote(v, k, full), ns);
exports.showTermSZ = (v, ns = list_1.Nil, vs = list_1.Nil, k = 0, full = false) => syntax_1.showSurface(exports.quoteZ(v, vs, k, full), ns);
exports.showElimQ = (e, k = 0, full = false) => {
    if (e.tag === 'EApp')
        return `${e.plicity ? '{' : ''}${exports.showTermQ(e.arg, k, full)}${e.plicity ? '}' : ''}`;
    return e.tag;
};
exports.showElim = (e, ns = list_1.Nil, k = 0, full = false) => {
    if (e.tag === 'EApp')
        return `${e.plicity ? '{' : ''}${exports.showTermS(e.arg, ns, k, full)}${e.plicity ? '}' : ''}`;
    if (e.tag === 'EUnsafeCast')
        return `unsafeCast {${exports.showTermS(e.type, ns, k, full)}}`;
    if (e.tag === 'EFst')
        return `fst`;
    if (e.tag === 'ESnd')
        return `snd`;
    return e;
};
const zonkSpine = (tm, vs, k, full) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.metaGet(tm.index);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(tm, vs, k, full)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            [true, syntax_1.App(spine[1], tm.plicity, exports.zonk(tm.right, vs, k, full))] :
            [false, exports.vapp(spine[1], tm.plicity, exports.evaluate(tm.right, vs))];
    }
    // TODO: zonk other elims
    return [true, exports.zonk(tm, vs, k, full)];
};
exports.zonk = (tm, vs = list_1.Nil, k = 0, full = false) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.metaGet(tm.index);
        return s.tag === 'Solved' ? exports.quote(s.val, k, full) : tm;
    }
    if (tm.tag === 'Pi')
        return syntax_1.Pi(tm.plicity, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Sigma')
        return syntax_1.Sigma(tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Let')
        return syntax_1.Let(tm.plicity, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.val, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Abs')
        return syntax_1.Abs(tm.plicity, tm.name, exports.zonk(tm.type, vs, k, full), exports.zonk(tm.body, exports.extendV(vs, exports.VVar(k)), k + 1, full));
    if (tm.tag === 'Pair')
        return syntax_1.Pair(exports.zonk(tm.fst, vs, k, full), exports.zonk(tm.snd, vs, k, full), exports.zonk(tm.type, vs, k, full));
    if (tm.tag === 'App') {
        const spine = zonkSpine(tm.left, vs, k, full);
        return spine[0] ?
            syntax_1.App(spine[1], tm.plicity, exports.zonk(tm.right, vs, k, full)) :
            exports.quote(exports.vapp(spine[1], tm.plicity, exports.evaluate(tm.right, vs)), k, full);
    }
    if (tm.tag === 'UnsafeCast')
        return syntax_1.UnsafeCast(exports.zonk(tm.type, vs, k, full), exports.zonk(tm.val, vs, k, full));
    if (tm.tag === 'Fst')
        return syntax_1.Fst(exports.zonk(tm.term, vs, k, full));
    if (tm.tag === 'Snd')
        return syntax_1.Snd(exports.zonk(tm.term, vs, k, full));
    return tm;
};

},{"./globalenv":4,"./metas":5,"./syntax":10,"./utils/lazy":13,"./utils/list":14,"./utils/utils":15}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalDelete = exports.globalSet = exports.globalGet = exports.globalMap = exports.globalReset = void 0;
let env = {};
exports.globalReset = () => {
    env = {};
};
exports.globalMap = () => env;
exports.globalGet = (name) => env[name] || null;
exports.globalSet = (name, term, val, type) => {
    env[name] = { term, val, type };
};
exports.globalDelete = (name) => {
    delete env[name];
};

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaDiscard = exports.metaPop = exports.metaPush = exports.freshMeta = exports.freshMetaId = exports.metaSet = exports.metaGet = exports.metaReset = void 0;
const syntax_1 = require("./syntax");
const utils_1 = require("./utils/utils");
const Unsolved = { tag: 'Unsolved' };
const Solved = (val) => ({ tag: 'Solved', val });
let metas = [];
const stack = [];
exports.metaReset = () => { metas = []; };
exports.metaGet = (id) => {
    const s = metas[id] || null;
    if (!s)
        return utils_1.impossible(`undefined meta ?${id} in metaGet`);
    return s;
};
exports.metaSet = (id, val) => {
    metas[id] = Solved(val);
};
exports.freshMetaId = () => {
    const id = metas.length;
    metas[id] = Unsolved;
    return id;
};
exports.freshMeta = () => syntax_1.Meta(exports.freshMetaId());
exports.metaPush = () => {
    stack.push(metas);
    metas = metas.slice();
};
exports.metaPop = () => {
    const x = stack.pop();
    if (!x)
        return;
    metas = x;
};
exports.metaDiscard = () => { stack.pop(); };

},{"./syntax":10,"./utils/utils":15}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextName = void 0;
exports.nextName = (x) => {
    if (x === '_')
        return x;
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDefs = exports.parseDef = exports.parse = void 0;
const utils_1 = require("./utils/utils");
const surface_1 = require("./surface");
const surface_2 = require("./surface");
const config_1 = require("./config");
const matchingBracket = (c) => {
    if (c === '(')
        return ')';
    if (c === ')')
        return '(';
    if (c === '{')
        return '}';
    if (c === '}')
        return '{';
    return utils_1.serr(`invalid bracket: ${c}`);
};
const TName = (name) => ({ tag: 'Name', name });
const TNum = (num) => ({ tag: 'Num', num });
const TList = (list, bracket) => ({ tag: 'List', list, bracket });
const SYM1 = ['\\', ':', '/', '.', '*', '=', '|', ','];
const SYM2 = ['->', '**'];
const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const tokenize = (sc) => {
    let state = START;
    let r = [];
    let t = '';
    let esc = false;
    let p = [], b = [];
    for (let i = 0, l = sc.length; i <= l; i++) {
        const c = sc[i] || ' ';
        const next = sc[i + 1] || '';
        if (state === START) {
            if (SYM2.indexOf(c + next) >= 0)
                r.push(TName(c + next)), i++;
            else if (SYM1.indexOf(c) >= 0)
                r.push(TName(c));
            else if (c + next === '--')
                i++, state = COMMENT;
            else if (/[\#\_a-z]/i.test(c))
                t += c, state = NAME;
            else if (/[0-9]/.test(c))
                t += c, state = NUMBER;
            else if (c === '(' || c === '{')
                b.push(c), p.push(r), r = [];
            else if (c === ')' || c === '}') {
                if (b.length === 0)
                    return utils_1.serr(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return utils_1.serr(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r, br));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return utils_1.serr(`invalid char ${c} in tokenize`);
        }
        else if (state === NAME) {
            if (!(/[a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
                r.push(TName(t));
                t = '', i--, state = START;
            }
            else
                t += c;
        }
        else if (state === NUMBER) {
            if (!/[0-9a-z]/i.test(c)) {
                r.push(TNum(t));
                t = '', i--, state = START;
            }
            else
                t += c;
        }
        else if (state === COMMENT) {
            if (c === '\n')
                state = START;
        }
    }
    if (b.length > 0)
        return utils_1.serr(`unclosed brackets: ${b.join(' ')}`);
    if (state !== START && state !== COMMENT)
        return utils_1.serr('invalid tokenize end state');
    if (esc)
        return utils_1.serr(`escape is true after tokenize`);
    return r;
};
const tunit = surface_1.Var('UnitType');
const unit = surface_1.Var('Unit');
const isName = (t, x) => t.tag === 'Name' && t.name === x;
const isNames = (t) => t.map(x => {
    if (x.tag !== 'Name')
        return utils_1.serr(`expected name`);
    return x.name;
});
const splitTokens = (a, fn, keepSymbol = false) => {
    const r = [];
    let t = [];
    for (let i = 0, l = a.length; i < l; i++) {
        const c = a[i];
        if (fn(c)) {
            r.push(t);
            t = keepSymbol ? [c] : [];
        }
        else
            t.push(c);
    }
    r.push(t);
    return r;
};
const lambdaParams = (t) => {
    if (t.tag === 'Name')
        return [[t.name, false, null]];
    if (t.tag === 'List') {
        const impl = t.bracket === '{';
        const a = t.list;
        if (a.length === 0)
            return [['_', impl, tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return isNames(a).map(x => [x, impl, null]);
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest, '(');
        return isNames(ns).map(x => [x, impl, ty]);
    }
    return utils_1.serr(`invalid lambda param`);
};
const piParams = (t) => {
    if (t.tag === 'Name')
        return [['_', false, expr(t)[0]]];
    if (t.tag === 'List') {
        const impl = t.bracket === '{';
        const a = t.list;
        if (a.length === 0)
            return [['_', impl, tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return [['_', impl, expr(t)[0]]];
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest, '(');
        return isNames(ns).map(x => [x, impl, ty]);
    }
    return utils_1.serr(`invalid pi param`);
};
const expr = (t) => {
    if (t.tag === 'List')
        return [exprs(t.list, '('), t.bracket === '{'];
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return [surface_1.Type, false];
        if (x.startsWith('_'))
            return [surface_1.Hole(x.slice(1) || null), false];
        if (x.startsWith('#')) {
            const n = +x.slice(1);
            if (isNaN(n) || n < 0 || Math.floor(n) !== n)
                return utils_1.serr(`invalid enum ${x}`);
            return [surface_1.Enum(n), false];
        }
        if (/[a-z]/i.test(x[0]))
            return [surface_1.Var(x), false];
        return utils_1.serr(`invalid name: ${x}`);
    }
    if (t.tag === 'Num') {
        if (t.num.endsWith('b')) {
            const n = +t.num.slice(0, -1);
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s0 = surface_1.Var('B0');
            const s1 = surface_1.Var('B1');
            let c = surface_1.Var('BE');
            const s = n.toString(2);
            for (let i = 0; i < s.length; i++)
                c = surface_1.App(s[i] === '0' ? s0 : s1, false, c);
            return [c, false];
        }
        else {
            const n = +t.num;
            if (isNaN(n))
                return utils_1.serr(`invalid number: ${t.num}`);
            const s = surface_1.Var('S');
            let c = surface_1.Var('Z');
            for (let i = 0; i < n; i++)
                c = surface_1.App(s, false, c);
            return [c, false];
        }
    }
    return t;
};
const exprs = (ts, br) => {
    if (br === '{')
        return utils_1.serr(`{} cannot be used here`);
    if (ts.length === 0)
        return unit;
    if (ts.length === 1)
        return expr(ts[0])[0];
    if (isName(ts[0], 'let')) {
        const x = ts[1];
        let impl = false;
        let name = 'ERROR';
        if (x.tag === 'Name') {
            name = x.name;
        }
        else if (x.tag === 'List' && x.bracket === '{') {
            const a = x.list;
            if (a.length !== 1)
                return utils_1.serr(`invalid name for let`);
            const h = a[0];
            if (h.tag !== 'Name')
                return utils_1.serr(`invalid name for let`);
            name = h.name;
            impl = true;
        }
        else
            return utils_1.serr(`invalid name for let`);
        let ty = null;
        let j = 2;
        if (isName(ts[j], ':')) {
            const tyts = [];
            j++;
            for (; j < ts.length; j++) {
                const v = ts[j];
                if (v.tag === 'Name' && v.name === '=')
                    break;
                else
                    tyts.push(v);
            }
            ty = exprs(tyts, '(');
        }
        if (!isName(ts[j], '='))
            return utils_1.serr(`no = after name in let`);
        const vals = [];
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
        if (!found)
            return utils_1.serr(`no in after let`);
        if (vals.length === 0)
            return utils_1.serr(`empty val in let`);
        const val = exprs(vals, '(');
        const body = exprs(ts.slice(i + 1), '(');
        if (ty)
            return surface_1.Let(impl, name, ty, val, body);
        if (val.tag === 'Ann')
            return surface_1.Let(impl, name, val.type, val.term, body);
        return surface_1.Let(impl, name, null, val, body);
    }
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return surface_1.Ann(exprs(a, '('), exprs(b, '('));
    }
    if (isName(ts[0], '\\')) {
        const args = [];
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
        if (!found)
            return utils_1.serr(`. not found after \\ or there was no whitespace after .`);
        const body = exprs(ts.slice(i + 1), '(');
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Abs(impl, name, ty, x), body);
    }
    if (isName(ts[0], 'unsafeCast')) {
        if (ts[1].tag === 'List' && ts[1].bracket === '{') {
            const [ty, b] = expr(ts[1]);
            if (!b)
                return utils_1.serr(`something went wrong when parsing UnsafeCast`);
            const body = exprs(ts.slice(2), '(');
            return surface_1.UnsafeCast(ty, body);
        }
        else {
            const body = exprs(ts.slice(1), '(');
            return surface_1.UnsafeCast(null, body);
        }
    }
    if (isName(ts[0], 'fst')) {
        if (ts.length < 2)
            return utils_1.serr(`something went wrong when parsing fst`);
        if (ts.length === 2) {
            const [term, tb] = expr(ts[1]);
            if (tb)
                return utils_1.serr(`something went wrong when parsing fst`);
            return surface_1.Fst(term);
        }
        const indPart = ts.slice(0, 2);
        const rest = ts.slice(2);
        return exprs([TList(indPart, '(')].concat(rest), '(');
    }
    if (isName(ts[0], 'snd')) {
        if (ts.length < 2)
            return utils_1.serr(`something went wrong when parsing snd`);
        if (ts.length === 2) {
            const [term, tb] = expr(ts[1]);
            if (tb)
                return utils_1.serr(`something went wrong when parsing snd`);
            return surface_1.Snd(term);
        }
        const indPart = ts.slice(0, 2);
        const rest = ts.slice(2);
        return exprs([TList(indPart, '(')].concat(rest), '(');
    }
    const j = ts.findIndex(x => isName(x, '->'));
    if (j >= 0) {
        const s = splitTokens(ts, x => isName(x, '->'));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with ->`);
        const args = s.slice(0, -1)
            .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')]])
            .reduce((x, y) => x.concat(y), []);
        const body = exprs(s[s.length - 1], '(');
        return args.reduceRight((x, [name, impl, ty]) => surface_1.Pi(impl, name, ty, x), body);
    }
    const js = ts.findIndex(x => isName(x, '**'));
    if (js >= 0) {
        const s = splitTokens(ts, x => isName(x, '**'));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with **`);
        const args = s.slice(0, -1)
            .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')]])
            .reduce((x, y) => x.concat(y), []);
        const body = exprs(s[s.length - 1], '(');
        return args.reduceRight((x, [name, impl, ty]) => {
            if (impl)
                return utils_1.serr(`sigma param cannot be implicit`);
            return surface_1.Sigma(name, ty, x);
        }, body);
    }
    const jp = ts.findIndex(x => isName(x, ','));
    if (jp >= 0) {
        const s = splitTokens(ts, x => isName(x, ','));
        if (s.length < 2)
            return utils_1.serr(`parsing failed with ,`);
        const args = s.map(x => exprs(x, '('));
        return args.reduce((x, y) => surface_1.Pair(x, y));
    }
    const l = ts.findIndex(x => isName(x, '\\'));
    let all = [];
    if (l >= 0) {
        const first = ts.slice(0, l).map(expr);
        const rest = exprs(ts.slice(l), '(');
        all = first.concat([[rest, false]]);
    }
    else {
        all = ts.map(expr);
    }
    if (all.length === 0)
        return utils_1.serr(`empty application`);
    if (all[0] && all[0][1])
        return utils_1.serr(`in application function cannot be between {}`);
    return all.slice(1).reduce((x, [y, impl]) => surface_1.App(x, impl, y), all[0][0]);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    const ex = exprs(ts, '(');
    return ex;
};
exports.parseDef = async (c, importMap) => {
    if (c.length === 0)
        return [];
    if (c[0].tag === 'Name' && c[0].name === 'import') {
        const files = c.slice(1).map(t => {
            if (t.tag !== 'Name')
                return utils_1.serr(`trying to import a non-path`);
            if (importMap[t.name]) {
                config_1.log(() => `skipping import ${t.name}`);
                return null;
            }
            return t.name;
        }).filter(x => x);
        config_1.log(() => `import ${files.join(' ')}`);
        const imps = await Promise.all(files.map(utils_1.loadFile));
        const defs = await Promise.all(imps.map(s => exports.parseDefs(s, importMap)));
        const fdefs = defs.reduce((x, y) => x.concat(y), []);
        fdefs.forEach(t => importMap[t.name] = true);
        config_1.log(() => `imported ${fdefs.map(x => x.name).join(' ')}`);
        return fdefs;
    }
    else if (c[0].tag === 'Name' && c[0].name === 'def') {
        if (c[1].tag === 'Name') {
            const name = c[1].name;
            const fst = 2;
            const sym = c[fst];
            if (sym.tag !== 'Name')
                return utils_1.serr(`def: after name should be : or =`);
            if (sym.name === '=') {
                return [surface_2.DDef(name, exprs(c.slice(fst + 1), '('))];
            }
            else if (sym.name === ':') {
                const tyts = [];
                let j = fst + 1;
                for (; j < c.length; j++) {
                    const v = c[j];
                    if (v.tag === 'Name' && v.name === '=')
                        break;
                    else
                        tyts.push(v);
                }
                const ety = exprs(tyts, '(');
                const body = exprs(c.slice(j + 1), '(');
                return [surface_2.DDef(name, surface_1.Let(false, name, ety, body, surface_1.Var(name)))];
            }
            else
                return utils_1.serr(`def: : or = expected but got ${sym.name}`);
        }
        else
            return utils_1.serr(`def should start with a name`);
    }
    else
        return utils_1.serr(`def should start with def or import`);
};
exports.parseDefs = async (s, importMap) => {
    const ts = tokenize(s);
    if (ts[0].tag !== 'Name' || (ts[0].name !== 'def' && ts[0].name !== 'import'))
        return utils_1.serr(`def should start with "def" or "import"`);
    const spl = splitTokens(ts, t => t.tag === 'Name' && (t.name === 'def' || t.name === 'import'), true);
    const ds = await Promise.all(spl.map(s => exports.parseDef(s, importMap)));
    return ds.reduce((x, y) => x.concat(y), []);
};

},{"./config":1,"./surface":9,"./utils/utils":15}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runREPL = exports.initREPL = void 0;
const config_1 = require("./config");
const surface_1 = require("./surface");
const parser_1 = require("./parser");
const globalenv_1 = require("./globalenv");
const utils_1 = require("./utils/utils");
const domain_1 = require("./domain");
const syntax_1 = require("./syntax");
const list_1 = require("./utils/list");
const typecheck_1 = require("./typecheck");
const verify_1 = require("./verify");
const help = `
COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:showEnvs or :showenvs] toggle showing environments in debug log messages
[:showNorm or :shownorm] toggle showing normalization
[:alwaysVerify] toggle verification of elaborated output
[:def definitions] define names
[:defs] show all defs
[:del name] delete a name
[:import files] import a file
[:view files] view a file
[:gtype name] view the fully normalized type of a name
[:gelab name] view the elaborated term of a name
[:gterm name] view the term of a name
[:gnorm name] view the fully normalized term of a name
[:t term] or [:type term] show the type of an expressions
[:verify term] verify elaborated output
`.trim();
let importMap = {};
exports.initREPL = () => {
    importMap = {};
};
exports.runREPL = (_s, _cb) => {
    try {
        _s = _s.trim();
        if (_s === ':help' || _s === ':h')
            return _cb(help);
        if (_s === ':debug' || _s === ':d') {
            config_1.setConfig({ debug: !config_1.config.debug });
            return _cb(`debug: ${config_1.config.debug}`);
        }
        if (_s.toLowerCase() === ':showenvs') {
            config_1.setConfig({ showEnvs: !config_1.config.showEnvs });
            return _cb(`showEnvs: ${config_1.config.showEnvs}`);
        }
        if (_s.toLowerCase() === ':shownorm') {
            config_1.setConfig({ showNormalization: !config_1.config.showNormalization });
            return _cb(`showNormalization: ${config_1.config.showNormalization}`);
        }
        if (_s.toLowerCase() === ':alwaysverify') {
            config_1.setConfig({ verify: !config_1.config.verify });
            return _cb(`verify: ${config_1.config.verify}`);
        }
        if (_s === ':defs') {
            const e = globalenv_1.globalMap();
            const msg = Object.keys(e).map(k => `def ${k} : ${domain_1.showTermSZ(e[k].type)} = ${syntax_1.showSurfaceZ(e[k].term)}`).join('\n');
            return _cb(msg || 'no definitions');
        }
        if (_s.startsWith(':del')) {
            const name = _s.slice(4).trim();
            globalenv_1.globalDelete(name);
            return _cb(`deleted ${name}`);
        }
        if (_s.startsWith(':def') || _s.startsWith(':import')) {
            const rest = _s.slice(1);
            parser_1.parseDefs(rest, importMap).then(ds => {
                const xs = typecheck_1.typecheckDefs(ds, true);
                return _cb(`defined ${xs.join(' ')}`);
            }).catch(err => _cb('' + err, true));
            return;
        }
        if (_s.startsWith(':view')) {
            const files = _s.slice(5).trim().split(/\s+/g);
            Promise.all(files.map(utils_1.loadFile)).then(ds => {
                return _cb(ds.join('\n\n'));
            }).catch(err => _cb('' + err, true));
            return;
        }
        if (_s.startsWith(':gtype')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermSZ(res.type, list_1.Nil, list_1.Nil, 0, true));
        }
        if (_s.startsWith(':gelab')) {
            const name = _s.slice(6).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            config_1.log(() => syntax_1.showTerm(res.term));
            return _cb(syntax_1.showSurfaceZ(res.term));
        }
        if (_s.startsWith(':gterm')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermSZ(res.val));
        }
        if (_s.startsWith(':gnorm')) {
            const name = _s.slice(7).trim();
            const res = globalenv_1.globalGet(name);
            if (!res)
                return _cb(`undefined global: ${name}`, true);
            return _cb(domain_1.showTermSZ(res.val, list_1.Nil, list_1.Nil, 0, true));
        }
        let typeOnly = false;
        let verifyOnce = false;
        if (_s.startsWith(':t')) {
            _s = _s.slice(_s.startsWith(':type') ? 5 : 2);
            typeOnly = true;
        }
        if (_s.startsWith(':verify')) {
            _s = _s.slice(7);
            verifyOnce = true;
        }
        if (_s.startsWith(':'))
            return _cb('invalid command', true);
        let msg = '';
        let tm_;
        try {
            const t = parser_1.parse(_s);
            config_1.log(() => surface_1.showTerm(t));
            const [ztm, vty] = typecheck_1.typecheck(t);
            tm_ = ztm;
            config_1.log(() => domain_1.showTermSZ(vty));
            config_1.log(() => syntax_1.showSurfaceZ(tm_));
            msg += `type: ${domain_1.showTermSZ(vty)}\nterm: ${syntax_1.showSurfaceZ(tm_)}`;
            if (config_1.config.verify || verifyOnce)
                verify_1.verify(ztm);
            if (typeOnly)
                return _cb(msg);
        }
        catch (err) {
            config_1.log(() => '' + err);
            return _cb('' + err, true);
        }
        try {
            const n = domain_1.normalize(tm_, list_1.Nil, 0, true);
            config_1.log(() => syntax_1.showSurfaceZErased(n));
            return _cb(`${msg}${config_1.config.showNormalization ? `\nnorm: ${syntax_1.showSurfaceZErased(n)}` : ''}`);
        }
        catch (err) {
            config_1.log(() => '' + err);
            msg += '\n' + err;
            return _cb(msg, true);
        }
    }
    catch (err) {
        config_1.log(() => '' + err);
        return _cb(err, true);
    }
};

},{"./config":1,"./domain":3,"./globalenv":4,"./parser":7,"./surface":9,"./syntax":10,"./typecheck":11,"./utils/list":14,"./utils/utils":15,"./verify":16}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDefs = exports.showDef = exports.DDef = exports.erase = exports.showTerm = exports.showTermP = exports.flattenPair = exports.flattenSigma = exports.flattenPi = exports.flattenAbs = exports.flattenApp = exports.showTermS = exports.Type = exports.UnsafeCast = exports.Meta = exports.Hole = exports.Ann = exports.Sort = exports.Enum = exports.Sigma = exports.Pi = exports.Let = exports.Snd = exports.Fst = exports.Pair = exports.Abs = exports.App = exports.Var = void 0;
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Pair = (fst, snd) => ({ tag: 'Pair', fst, snd });
exports.Fst = (term) => ({ tag: 'Fst', term });
exports.Snd = (term) => ({ tag: 'Snd', term });
exports.Let = (plicity, name, type, val, body) => ({ tag: 'Let', plicity, name, type, val, body });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Sigma = (name, type, body) => ({ tag: 'Sigma', name, type, body });
exports.Enum = (num) => ({ tag: 'Enum', num });
exports.Sort = (sort) => ({ tag: 'Sort', sort });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Hole = (name = null) => ({ tag: 'Hole', name });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.UnsafeCast = (type, val) => ({ tag: 'UnsafeCast', type, val });
exports.Type = exports.Sort('*');
exports.showTermS = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Enum')
        return `#${t.num}`;
    if (t.tag === 'App')
        return `(${exports.showTermS(t.left)} ${t.plicity ? '-' : ''}${exports.showTermS(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ? `(\\(${t.plicity ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})` : `(\\${t.plicity ? '-' : ''}${t.name}. ${exports.showTermS(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity ? '-' : ''}${t.name}${t.type ? ` : ${exports.showTermS(t.type)}` : ''} = ${exports.showTermS(t.val)} in ${exports.showTermS(t.body)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity ? '-' : ''}${t.name} : ${exports.showTermS(t.type)}). ${exports.showTermS(t.body)})`;
    if (t.tag === 'Sigma')
        return `((${t.name} : ${exports.showTermS(t.type)}) ** ${exports.showTermS(t.body)})`;
    if (t.tag === 'Sort')
        return t.sort;
    if (t.tag === 'Ann')
        return `(${exports.showTermS(t.term)} : ${exports.showTermS(t.type)})`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    if (t.tag === 'UnsafeCast')
        return `(unsafeCast ${t.type ? `{${exports.showTermS(t.type)}} ` : ''}${exports.showTermS(t.val)})`;
    if (t.tag === 'Pair')
        return `(${exports.showTermS(t.fst)}, ${exports.showTermS(t.snd)})`;
    if (t.tag === 'Fst')
        return `(fst ${exports.showTermS(t.term)})`;
    if (t.tag === 'Snd')
        return `(snd ${exports.showTermS(t.term)})`;
    return t;
};
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push([t.plicity, t.right]);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.plicity, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.plicity, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenSigma = (t) => {
    const r = [];
    while (t.tag === 'Sigma') {
        r.push([t.name, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPair = (t) => {
    const r = [];
    while (t.tag === 'Pair') {
        r.push(t.fst);
        t = t.snd;
    }
    r.push(t);
    return r;
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Sort')
        return t.sort;
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Enum')
        return `#${t.num}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'Sigma' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Fst' || f.tag === 'Snd', f)} ${as.map(([im, t], i) => im ? `{${exports.showTerm(t)}}` :
            `${exports.showTermP(t.tag === 'App' || t.tag === 'Ann' || t.tag === 'Let' || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi' || t.tag === 'Sigma' || t.tag === 'Fst' || t.tag === 'Snd', t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, im, t]) => im ? `{${x}${t ? ` : ${exports.showTermP(t.tag === 'Ann', t)}` : ''}}` : !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, im, t]) => x === '_' ? (im ? `${im ? '{' : ''}${exports.showTerm(t)}${im ? '}' : ''}` : exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma' || t.tag === 'Fst' || t.tag === 'Snd', t)) : `${im ? '{' : '('}${x} : ${exports.showTermP(t.tag === 'Ann', t)}${im ? '}' : ')'}`).join(' -> ')} -> ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Sigma') {
        const [as, b] = exports.flattenSigma(t);
        return `${as.map(([x, t]) => x === '_' ? exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Sigma' || t.tag === 'Fst' || t.tag === 'Snd', t) : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ** ')} ** ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pair') {
        const ps = exports.flattenPair(t);
        return `(${ps.map(t => exports.showTerm(t)).join(', ')})`;
    }
    if (t.tag === 'Let')
        return `let ${t.plicity ? `{${t.name}}` : t.name}${t.type ? ` : ${exports.showTermP(t.type.tag === 'Let' || t.type.tag === 'Ann', t.type)}` : ''} = ${exports.showTermP(t.val.tag === 'Let', t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Ann')
        return `${exports.showTermP(t.term.tag === 'Ann', t.term)} : ${exports.showTermP(t.term.tag === 'Ann', t.type)}`;
    if (t.tag === 'Hole')
        return `_${t.name || ''}`;
    if (t.tag === 'UnsafeCast')
        return `unsafeCast ${t.type ? `{${exports.showTermS(t.type)}} ` : ''}${exports.showTermP(t.val.tag !== 'Var' && t.val.tag !== 'Meta' && t.val.tag !== 'Sort', t.val)}`;
    if (t.tag === 'Fst')
        return `fst ${exports.showTermP(t.term.tag !== 'Var' && t.term.tag !== 'Meta' && t.term.tag !== 'Sort', t.term)}`;
    if (t.tag === 'Snd')
        return `snd ${exports.showTermP(t.term.tag !== 'Var' && t.term.tag !== 'Meta' && t.term.tag !== 'Sort', t.term)}`;
    return t;
};
exports.erase = (t) => {
    if (t.tag === 'Hole')
        return t;
    if (t.tag === 'Meta')
        return t;
    if (t.tag === 'Var')
        return t;
    if (t.tag === 'Sort')
        return t;
    if (t.tag === 'Enum')
        return t;
    if (t.tag === 'Ann')
        return exports.erase(t.term);
    if (t.tag === 'Abs')
        return t.plicity ? exports.erase(t.body) : exports.Abs(false, t.name, null, exports.erase(t.body));
    if (t.tag === 'Pair')
        return exports.Pair(exports.erase(t.fst), exports.erase(t.snd));
    if (t.tag === 'App')
        return t.plicity ? exports.erase(t.left) : exports.App(exports.erase(t.left), false, exports.erase(t.right));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, t.name, exports.erase(t.type), exports.erase(t.body));
    if (t.tag === 'Sigma')
        return exports.Sigma(t.name, exports.erase(t.type), exports.erase(t.body));
    if (t.tag === 'Let')
        return t.plicity ? exports.erase(t.body) : exports.Let(false, t.name, null, exports.erase(t.val), exports.erase(t.body));
    if (t.tag === 'UnsafeCast')
        return exports.erase(t.val);
    if (t.tag === 'Fst')
        return exports.Fst(exports.erase(t.term));
    if (t.tag === 'Snd')
        return exports.Snd(exports.erase(t.term));
    return t;
};
exports.DDef = (name, value) => ({ tag: 'DDef', name, value });
exports.showDef = (d) => {
    if (d.tag === 'DDef')
        return `def ${d.name} = ${exports.showTerm(d.value)}`;
    return d.tag;
};
exports.showDefs = (ds) => ds.map(exports.showDef).join('\n');

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shift = exports.showSurfaceZErased = exports.showSurfaceZ = exports.showSurface = exports.toSurface = exports.isUnsolved = exports.indexUsed = exports.globalUsed = exports.showTerm = exports.Type = exports.UnsafeCast = exports.Meta = exports.Sort = exports.Enum = exports.Sigma = exports.Pi = exports.Let = exports.Snd = exports.Fst = exports.Pair = exports.Abs = exports.App = exports.Global = exports.Var = void 0;
const names_1 = require("./names");
const list_1 = require("./utils/list");
const S = require("./surface");
const utils_1 = require("./utils/utils");
const domain_1 = require("./domain");
exports.Var = (index) => ({ tag: 'Var', index });
exports.Global = (name) => ({ tag: 'Global', name });
exports.App = (left, plicity, right) => ({ tag: 'App', left, plicity, right });
exports.Abs = (plicity, name, type, body) => ({ tag: 'Abs', plicity, name, type, body });
exports.Pair = (fst, snd, type) => ({ tag: 'Pair', fst, snd, type });
exports.Fst = (term) => ({ tag: 'Fst', term });
exports.Snd = (term) => ({ tag: 'Snd', term });
exports.Let = (plicity, name, type, val, body) => ({ tag: 'Let', plicity, name, type, val, body });
exports.Pi = (plicity, name, type, body) => ({ tag: 'Pi', plicity, name, type, body });
exports.Sigma = (name, type, body) => ({ tag: 'Sigma', name, type, body });
exports.Enum = (num) => ({ tag: 'Enum', num });
exports.Sort = (sort) => ({ tag: 'Sort', sort });
exports.Meta = (index) => ({ tag: 'Meta', index });
exports.UnsafeCast = (type, val) => ({ tag: 'UnsafeCast', type, val });
exports.Type = exports.Sort('*');
exports.showTerm = (t) => {
    if (t.tag === 'Var')
        return `${t.index}`;
    if (t.tag === 'Meta')
        return `?${t.index}`;
    if (t.tag === 'Global')
        return t.name;
    if (t.tag === 'Enum')
        return `#${t.num}`;
    if (t.tag === 'App')
        return `(${exports.showTerm(t.left)} ${t.plicity ? '-' : ''}${exports.showTerm(t.right)})`;
    if (t.tag === 'Abs')
        return `(\\(${t.plicity ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Pair')
        return `(${exports.showTerm(t.fst)}, ${exports.showTerm(t.snd)} : ${exports.showTerm(t.type)})`;
    if (t.tag === 'Let')
        return `(let ${t.plicity ? '-' : ''}${t.name} : ${exports.showTerm(t.type)} = ${exports.showTerm(t.val)} in ${exports.showTerm(t.body)})`;
    if (t.tag === 'Pi')
        return `(/(${t.plicity ? '-' : ''}${t.name} : ${exports.showTerm(t.type)}). ${exports.showTerm(t.body)})`;
    if (t.tag === 'Sigma')
        return `((${t.name} : ${exports.showTerm(t.type)}) ** ${exports.showTerm(t.body)})`;
    if (t.tag === 'Sort')
        return t.sort;
    if (t.tag === 'UnsafeCast')
        return `(unsafeCast ${t.type ? `{${exports.showTerm(t.type)}} ` : ''}${exports.showTerm(t.val)})`;
    if (t.tag === 'Fst')
        return `(fst ${exports.showTerm(t.term)})`;
    if (t.tag === 'Snd')
        return `(snd ${exports.showTerm(t.term)})`;
    return t;
};
exports.globalUsed = (k, t) => {
    if (t.tag === 'Global')
        return t.name === k;
    if (t.tag === 'App')
        return exports.globalUsed(k, t.left) || exports.globalUsed(k, t.right);
    if (t.tag === 'Fst')
        return exports.globalUsed(k, t.term);
    if (t.tag === 'Snd')
        return exports.globalUsed(k, t.term);
    if (t.tag === 'Pair')
        return exports.globalUsed(k, t.fst) || exports.globalUsed(k, t.snd) || exports.globalUsed(k, t.type);
    if (t.tag === 'Abs')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.body);
    if (t.tag === 'Let')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.val) || exports.globalUsed(k, t.body);
    if (t.tag === 'Pi')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.body);
    if (t.tag === 'Sigma')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.body);
    if (t.tag === 'UnsafeCast')
        return exports.globalUsed(k, t.type) || exports.globalUsed(k, t.val);
    return false;
};
exports.indexUsed = (k, t) => {
    if (t.tag === 'Var')
        return t.index === k;
    if (t.tag === 'App')
        return exports.indexUsed(k, t.left) || exports.indexUsed(k, t.right);
    if (t.tag === 'Pair')
        return exports.indexUsed(k, t.fst) || exports.indexUsed(k, t.snd) || exports.indexUsed(k, t.type);
    if (t.tag === 'Abs')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Let')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k, t.val) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Pi')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'Sigma')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k + 1, t.body);
    if (t.tag === 'UnsafeCast')
        return exports.indexUsed(k, t.type) || exports.indexUsed(k, t.val);
    if (t.tag === 'Fst')
        return exports.indexUsed(k, t.term);
    if (t.tag === 'Snd')
        return exports.indexUsed(k, t.term);
    return false;
};
exports.isUnsolved = (t) => {
    if (t.tag === 'Meta')
        return true;
    if (t.tag === 'App')
        return exports.isUnsolved(t.left) || exports.isUnsolved(t.right);
    if (t.tag === 'Pair')
        return exports.isUnsolved(t.fst) || exports.isUnsolved(t.snd) || exports.isUnsolved(t.type);
    if (t.tag === 'Abs')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'Let')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.val) || exports.isUnsolved(t.body);
    if (t.tag === 'Pi')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'Sigma')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'UnsafeCast')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.val);
    if (t.tag === 'Fst')
        return exports.isUnsolved(t.term);
    if (t.tag === 'Snd')
        return exports.isUnsolved(t.term);
    return false;
};
const decideNameMany = (x, t, ns) => {
    if (x === '_')
        return x;
    const a = list_1.indecesOf(ns, x).some(i => t.some(c => exports.indexUsed(i + 1, c)));
    const g = t.some(c => exports.globalUsed(x, c));
    return a || g ? decideNameMany(names_1.nextName(x), t, ns) : x;
};
const decideName = (x, t, ns) => decideNameMany(x, [t], ns);
exports.toSurface = (t, ns = list_1.Nil) => {
    if (t.tag === 'Var') {
        const l = list_1.index(ns, t.index);
        return l ? S.Var(l) : utils_1.impossible(`var index out of range in toSurface: ${t.index}`);
    }
    if (t.tag === 'Meta')
        return S.Meta(t.index);
    if (t.tag === 'Sort')
        return S.Sort(t.sort);
    if (t.tag === 'Global')
        return S.Var(t.name);
    if (t.tag === 'Enum')
        return S.Enum(t.num);
    if (t.tag === 'App')
        return S.App(exports.toSurface(t.left, ns), t.plicity, exports.toSurface(t.right, ns));
    if (t.tag === 'Pair')
        return S.Ann(S.Pair(exports.toSurface(t.fst, ns), exports.toSurface(t.snd, ns)), exports.toSurface(t.type, ns));
    if (t.tag === 'UnsafeCast')
        return S.UnsafeCast(exports.toSurface(t.type, ns), exports.toSurface(t.val, ns));
    if (t.tag === 'Fst')
        return S.Fst(exports.toSurface(t.term, ns));
    if (t.tag === 'Snd')
        return S.Snd(exports.toSurface(t.term, ns));
    if (t.tag === 'Abs') {
        const x = decideName(t.name, t.body, ns);
        return S.Abs(t.plicity, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Let') {
        const x = decideName(t.name, t.body, ns);
        return S.Let(t.plicity, x, exports.toSurface(t.type, ns), exports.toSurface(t.val, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Pi') {
        const x = decideName(t.name, t.body, ns);
        return S.Pi(t.plicity, x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    if (t.tag === 'Sigma') {
        const x = decideName(t.name, t.body, ns);
        return S.Sigma(x, exports.toSurface(t.type, ns), exports.toSurface(t.body, list_1.Cons(x, ns)));
    }
    return t;
};
exports.showSurface = (t, ns = list_1.Nil) => S.showTerm(exports.toSurface(t, ns));
exports.showSurfaceZ = (t, ns = list_1.Nil, vs = list_1.Nil, k = 0, full = false) => S.showTerm(exports.toSurface(domain_1.zonk(t, vs, k, full), ns));
exports.showSurfaceZErased = (t, ns = list_1.Nil, vs = list_1.Nil, k = 0, full = false) => S.showTerm(S.erase(exports.toSurface(domain_1.zonk(t, vs, k, full), ns)));
exports.shift = (d, c, t) => {
    if (t.tag === 'Var')
        return t.index < c ? t : exports.Var(t.index + d);
    if (t.tag === 'Abs')
        return exports.Abs(t.plicity, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'App')
        return exports.App(exports.shift(d, c, t.left), t.plicity, exports.shift(d, c, t.right));
    if (t.tag === 'Pair')
        return exports.Pair(exports.shift(d, c, t.fst), exports.shift(d, c, t.snd), exports.shift(d, c, t.type));
    if (t.tag === 'Let')
        return exports.Let(t.plicity, t.name, exports.shift(d, c, t.type), exports.shift(d, c, t.val), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Pi')
        return exports.Pi(t.plicity, t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'Sigma')
        return exports.Sigma(t.name, exports.shift(d, c, t.type), exports.shift(d, c + 1, t.body));
    if (t.tag === 'UnsafeCast')
        return exports.UnsafeCast(exports.shift(d, c, t.type), exports.shift(d, c, t.val));
    if (t.tag === 'Fst')
        return exports.Fst(exports.shift(d, c, t.term));
    if (t.tag === 'Snd')
        return exports.Snd(exports.shift(d, c, t.term));
    return t;
};

},{"./domain":3,"./names":6,"./surface":9,"./utils/list":14,"./utils/utils":15}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typecheckDefs = exports.typecheck = exports.showLocal = exports.localInType = exports.extend = exports.localEmpty = void 0;
const syntax_1 = require("./syntax");
const domain_1 = require("./domain");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const unify_1 = require("./unify");
const S = require("./surface");
const config_1 = require("./config");
const globalenv_1 = require("./globalenv");
const metas_1 = require("./metas");
const verify_1 = require("./verify");
const extendT = (ts, val, bound, plicity, inserted) => list_1.Cons({ type: val, bound, plicity, inserted }, ts);
const showEnvT = (ts, k = 0, full = false) => list_1.listToString(ts, entry => `${entry.bound ? '' : 'd '}${entry.plicity ? 'e ' : ''}${entry.inserted ? 'i ' : ''}${domain_1.showTermQ(entry.type, k, full)}`);
const indexT = (ts, ix) => {
    let l = ts;
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head.inserted) {
            l = l.tail;
            i++;
            continue;
        }
        if (ix === 0)
            return [l.head, i];
        i++;
        ix--;
        l = l.tail;
    }
    return null;
};
exports.localEmpty = { names: list_1.Nil, namesSurface: list_1.Nil, ts: list_1.Nil, vs: list_1.Nil, index: 0, inType: false };
exports.extend = (l, name, ty, bound, plicity, inserted, val, inType = l.inType) => ({
    names: list_1.Cons(name, l.names),
    namesSurface: inserted ? l.namesSurface : list_1.Cons(name, l.namesSurface),
    ts: extendT(l.ts, ty, bound, plicity, inserted),
    vs: domain_1.extendV(l.vs, val),
    index: l.index + 1,
    inType,
});
exports.localInType = (l, inType = true) => ({
    names: l.names,
    namesSurface: l.namesSurface,
    ts: l.ts,
    vs: l.vs,
    index: l.index,
    inType,
});
exports.showLocal = (l, full = false) => `Local(${l.index}, ${l.inType}, ${showEnvT(l.ts, l.index, full)}, ${domain_1.showEnvV(l.vs, l.index, full)}, ${list_1.listToString(l.names)}, ${list_1.listToString(l.namesSurface)})`;
const newMeta = (ts) => {
    const spine = list_1.filter(list_1.mapIndex(ts, (i, { bound }) => bound ? syntax_1.Var(i) : null), x => x !== null);
    return list_1.foldr((x, y) => syntax_1.App(y, false, x), metas_1.freshMeta(), spine);
};
const inst = (ts, vs, ty_) => {
    const ty = domain_1.forceGlue(ty_);
    if (ty.tag === 'VPi' && ty.plicity) {
        const m = newMeta(ts);
        const vm = domain_1.evaluate(m, vs);
        const [res, args] = inst(ts, vs, ty.body(vm));
        return [res, list_1.Cons(m, args)];
    }
    return [ty, list_1.Nil];
};
const check = (local, tm, ty) => {
    config_1.log(() => `check ${S.showTerm(tm)} : ${domain_1.showTermS(ty, local.names, local.index)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    const fty = domain_1.force(ty);
    if (tm.tag === 'Sort' && fty.tag === 'VSort' && fty.sort === '*')
        return syntax_1.Sort(tm.sort);
    if (tm.tag === 'Hole') {
        const x = newMeta(local.ts);
        return x;
    }
    if (tm.tag === 'UnsafeCast') {
        const type = domain_1.quote(ty, local.index, false);
        const [val] = synth(local, tm.val);
        return syntax_1.UnsafeCast(type, val);
    }
    if (tm.tag === 'Pair' && fty.tag === 'VSigma') {
        const fst = check(local, tm.fst, fty.type);
        const snd = check(local, tm.snd, fty.body(domain_1.evaluate(fst, local.vs)));
        return syntax_1.Pair(fst, snd, domain_1.quote(ty, local.index, false));
    }
    if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && tm.plicity === fty.plicity) {
        const v = domain_1.VVar(local.index);
        const x = tm.name === '_' ? fty.name : tm.name;
        const body = check(exports.extend(local, x, fty.type, true, fty.plicity, false, v), tm.body, fty.body(v));
        return syntax_1.Abs(tm.plicity, x, domain_1.quote(fty.type, local.index, false), body);
    }
    if (tm.tag === 'Abs' && !tm.type && fty.tag === 'VPi' && !tm.plicity && fty.plicity) {
        const v = domain_1.VVar(local.index);
        const term = check(exports.extend(local, fty.name, fty.type, true, true, true, v), tm, fty.body(v));
        return syntax_1.Abs(fty.plicity, fty.name, domain_1.quote(fty.type, local.index, false), term);
    }
    if (tm.tag === 'Let') {
        let vty;
        let val;
        let type;
        if (tm.type) {
            type = check(exports.localInType(local), tm.type, domain_1.VType);
            vty = domain_1.evaluate(type, local.vs);
            val = check(local, tm.val, vty);
        }
        else {
            [val, vty] = synth(local, tm.val);
            type = domain_1.quote(vty, local.index, false);
        }
        const body = check(exports.extend(local, tm.name, vty, false, tm.plicity, false, domain_1.evaluate(val, local.vs)), tm.body, ty);
        return syntax_1.Let(tm.plicity, tm.name, type, val, body);
    }
    const [term, ty2] = synth(local, tm);
    try {
        config_1.log(() => `unify ${domain_1.showTermS(ty2, local.names, local.index)} ~ ${domain_1.showTermS(ty, local.names, local.index)}`);
        metas_1.metaPush();
        unify_1.unify(local.index, ty2, ty);
        metas_1.metaDiscard();
        return term;
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        try {
            metas_1.metaPop();
            metas_1.metaPush();
            const [ty2inst, ms] = inst(local.ts, local.vs, ty2);
            config_1.log(() => `unify-inst ${domain_1.showTermS(ty2inst, local.names, local.index)} ~ ${domain_1.showTermS(ty, local.names, local.index)}`);
            unify_1.unify(local.index, ty2inst, ty);
            metas_1.metaDiscard();
            return list_1.foldl((a, m) => syntax_1.App(a, true, m), term, ms);
        }
        catch {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
            return utils_1.terr(`failed to unify ${domain_1.showTermS(ty2, local.names, local.index)} ~ ${domain_1.showTermS(ty, local.names, local.index)}: ${err.message}`);
        }
    }
};
const freshPi = (ts, vs, x, impl) => {
    const a = newMeta(ts);
    const va = domain_1.evaluate(a, vs);
    const b = newMeta(extendT(ts, va, true, impl, false));
    return domain_1.VPi(impl, x, va, v => domain_1.evaluate(b, domain_1.extendV(vs, v)));
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${S.showTerm(tm)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    if (tm.tag === 'Sort')
        return [tm, domain_1.VType];
    if (tm.tag === 'Enum')
        return [tm, domain_1.VType];
    if (tm.tag === 'Var') {
        const i = list_1.indexOf(local.namesSurface, tm.name);
        if (i < 0) {
            const entry = globalenv_1.globalGet(tm.name);
            if (!entry)
                return utils_1.terr(`global ${tm.name} not found`);
            return [syntax_1.Global(tm.name), entry.type];
        }
        else {
            const [entry, j] = indexT(local.ts, i) || utils_1.terr(`var out of scope ${S.showTerm(tm)}`);
            if (entry.plicity && !local.inType)
                return utils_1.terr(`erased parameter ${S.showTerm(tm)} used`);
            return [syntax_1.Var(j), entry.type];
        }
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(local.ts);
        const vt = domain_1.evaluate(newMeta(local.ts), local.vs);
        return [t, vt];
    }
    if (tm.tag === 'App') {
        const [left, ty] = synth(local, tm.left);
        const [right, rty, ms] = synthapp(local, ty, tm.plicity, tm.right, tm);
        return [syntax_1.App(list_1.foldl((f, a) => syntax_1.App(f, true, a), left, ms), tm.plicity, right), rty];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(exports.localInType(local), tm.type, domain_1.VType);
            const vtype = domain_1.evaluate(type, local.vs);
            const [body, rt] = synth(exports.extend(local, tm.name, vtype, true, tm.plicity, false, domain_1.VVar(local.index)), tm.body);
            const pi = domain_1.evaluate(syntax_1.Pi(tm.plicity, tm.name, type, domain_1.quote(rt, local.index + 1, false)), local.vs);
            return [syntax_1.Abs(tm.plicity, tm.name, type, body), pi];
        }
        else {
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
            type = check(exports.localInType(local), tm.type, domain_1.VType);
            vty = domain_1.evaluate(type, local.vs);
            val = check(local, tm.val, vty);
        }
        else {
            [val, vty] = synth(local, tm.val);
            type = domain_1.quote(vty, local.index, false);
        }
        const [body, rt] = synth(exports.extend(local, tm.name, vty, false, tm.plicity, false, domain_1.evaluate(val, local.vs)), tm.body);
        return [syntax_1.Let(tm.plicity, tm.name, type, val, body), rt];
    }
    if (tm.tag === 'Pi') {
        const type = check(exports.localInType(local), tm.type, domain_1.VType);
        const body = check(exports.extend(local, tm.name, domain_1.evaluate(type, local.vs), true, false, false, domain_1.VVar(local.index)), tm.body, domain_1.VType);
        return [syntax_1.Pi(tm.plicity, tm.name, type, body), domain_1.VType];
    }
    if (tm.tag === 'Sigma') {
        const type = check(exports.localInType(local), tm.type, domain_1.VType);
        const body = check(exports.extend(local, tm.name, domain_1.evaluate(type, local.vs), true, false, false, domain_1.VVar(local.index)), tm.body, domain_1.VType);
        return [syntax_1.Sigma(tm.name, type, body), domain_1.VType];
    }
    if (tm.tag === 'Pair') {
        const [fst, fstty] = synth(local, tm.fst);
        const [snd, sndty] = synth(local, tm.snd);
        const ty = domain_1.VSigma('_', fstty, _ => sndty);
        const qty = domain_1.quote(ty, local.index, false);
        return [syntax_1.Pair(fst, snd, qty), ty];
    }
    if (tm.tag === 'Fst') {
        const [term, ty] = synth(local, tm.term);
        const fty = domain_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in fst: ${S.showTerm(tm)}`);
        return [syntax_1.Fst(term), fty.type];
    }
    if (tm.tag === 'Snd') {
        const [term, ty] = synth(local, tm.term);
        const fty = domain_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in snd: ${S.showTerm(tm)}`);
        return [syntax_1.Snd(term), fty.body(domain_1.vfst(domain_1.evaluate(term, local.vs)))];
    }
    if (tm.tag === 'Ann') {
        const type = check(exports.localInType(local), tm.type, domain_1.VType);
        const vtype = domain_1.evaluate(type, local.vs);
        const term = check(local, tm.term, vtype);
        return [syntax_1.Let(false, 'x', type, term, syntax_1.Var(0)), vtype];
    }
    if (tm.tag === 'UnsafeCast') {
        if (tm.type) {
            const type = check(exports.localInType(local), tm.type, domain_1.VType);
            const vt = domain_1.evaluate(type, local.vs);
            const [val] = synth(local, tm.val);
            return [syntax_1.UnsafeCast(type, val), vt];
        }
        else {
            const type = newMeta(local.ts);
            const vt = domain_1.evaluate(type, local.vs);
            const [val] = synth(local, tm.val);
            return [syntax_1.UnsafeCast(type, val), vt];
        }
    }
    return utils_1.terr(`cannot synth ${S.showTerm(tm)}`);
};
const synthapp = (local, ty_, plicity, tm, tmall) => {
    config_1.log(() => `synthapp ${domain_1.showTermS(ty_, local.names, local.index)} ${plicity ? '-' : ''}@ ${S.showTerm(tm)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    const ty = domain_1.force(ty_);
    if (ty.tag === 'VPi' && ty.plicity && !plicity) {
        const m = newMeta(local.ts);
        const vm = domain_1.evaluate(m, local.vs);
        const [rest, rt, l] = synthapp(local, ty.body(vm), plicity, tm, tmall);
        return [rest, rt, list_1.Cons(m, l)];
    }
    if (ty.tag === 'VPi' && ty.plicity === plicity) {
        const right = check(plicity ? exports.localInType(local) : local, tm, ty.type);
        const rt = ty.body(domain_1.evaluate(right, local.vs));
        return [right, rt, list_1.Nil];
    }
    // TODO fix the following
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const a = metas_1.freshMetaId();
        const b = metas_1.freshMetaId();
        const pi = domain_1.VPi(plicity, '_', domain_1.VNe(domain_1.HMeta(a), ty.args), () => domain_1.VNe(domain_1.HMeta(b), ty.args));
        unify_1.unify(local.index, ty, pi);
        return synthapp(local, pi, plicity, tm, tmall);
    }
    return utils_1.terr(`invalid type or plicity mismatch in synthapp in ${S.showTerm(tmall)}: ${domain_1.showTermQ(ty, local.index)} ${plicity ? '-' : ''}@ ${S.showTerm(tm)}`);
};
exports.typecheck = (tm) => {
    const [etm, ty] = synth(exports.localEmpty, tm);
    const ztm = domain_1.zonk(etm, list_1.Nil, 0);
    if (syntax_1.isUnsolved(ztm))
        return utils_1.terr(`elaborated term was unsolved: ${syntax_1.showSurfaceZ(ztm)}`);
    if (config_1.config.verify)
        verify_1.verify(ztm);
    return [ztm, ty];
};
exports.typecheckDefs = (ds, allowRedefinition = false) => {
    config_1.log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
    const xs = [];
    if (!allowRedefinition) {
        for (let i = 0; i < ds.length; i++) {
            const d = ds[i];
            if (d.tag === 'DDef' && globalenv_1.globalGet(d.name))
                return utils_1.terr(`cannot redefine global ${d.name}`);
        }
    }
    for (let i = 0; i < ds.length; i++) {
        const d = ds[i];
        config_1.log(() => `typecheckDefs ${S.showDef(d)}`);
        if (d.tag === 'DDef') {
            const [tm_, ty] = exports.typecheck(d.value);
            const tm = domain_1.zonk(tm_);
            config_1.log(() => `set ${d.name} = ${syntax_1.showTerm(tm)}`);
            globalenv_1.globalSet(d.name, tm, domain_1.evaluate(tm, list_1.Nil), ty);
            xs.push(d.name);
        }
    }
    return xs;
};

},{"./config":1,"./domain":3,"./globalenv":4,"./metas":5,"./surface":9,"./syntax":10,"./unify":12,"./utils/list":14,"./utils/utils":15,"./verify":16}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unify = void 0;
const utils_1 = require("./utils/utils");
const domain_1 = require("./domain");
const lazy_1 = require("./utils/lazy");
const list_1 = require("./utils/list");
const config_1 = require("./config");
const metas_1 = require("./metas");
const syntax_1 = require("./syntax");
const conv_1 = require("./conv");
const unifyElim = (k, a, b, x, y) => {
    if (a === b)
        return;
    if (a.tag === 'EApp' && b.tag === 'EApp' && a.plicity === b.plicity)
        return exports.unify(k, a.arg, b.arg);
    if (a.tag === 'EUnsafeCast' && b.tag === 'EUnsafeCast')
        return exports.unify(k, a.type, b.type);
    if (a.tag === 'EFst' && b.tag === 'EFst')
        return;
    if (a.tag === 'ESnd' && b.tag === 'ESnd')
        return;
    return utils_1.terr(`unify failed (${k}): ${domain_1.showTermQ(x, k)} ~ ${domain_1.showTermQ(y, k)}`);
};
exports.unify = (k, a_, b_) => {
    const a = domain_1.forceGlue(a_);
    const b = domain_1.forceGlue(b_);
    config_1.log(() => `unify(${k}) ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
    if (a === b)
        return;
    if (a.tag === 'VSort' && b.tag === 'VSort' && a.sort === b.sort)
        return;
    if (a.tag === 'VEnum' && b.tag === 'VEnum' && a.num === b.num)
        return;
    if (a.tag === 'VPi' && b.tag === 'VPi' && a.plicity === b.plicity) {
        exports.unify(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VSigma' && b.tag === 'VSigma') {
        exports.unify(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VPair' && b.tag === 'VPair') {
        exports.unify(k, a.fst, b.fst);
        exports.unify(k, a.snd, b.snd);
        return exports.unify(k, a.type, b.type);
    }
    if (a.tag === 'VAbs' && b.tag === 'VAbs' && a.plicity === b.plicity) {
        exports.unify(k, a.type, b.type);
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), b.body(v));
    }
    if (a.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, a.body(v), domain_1.vapp(b, a.plicity, v));
    }
    if (b.tag === 'VAbs') {
        const v = domain_1.VVar(k);
        return exports.unify(k + 1, domain_1.vapp(a, b.plicity, v), b.body(v));
    }
    if (a.tag === 'VPair') {
        conv_1.conv(k, a.fst, domain_1.vfst(b));
        return conv_1.conv(k, a.snd, domain_1.vsnd(b));
    }
    if (b.tag === 'VPair') {
        conv_1.conv(k, domain_1.vfst(a), b.fst);
        return conv_1.conv(k, domain_1.vsnd(a), b.snd);
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && conv_1.eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args))
        return list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(k, a.head.index, a.args, b) :
            solve(k, b.head.index, b.args, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(k, a.head.index, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(k, b.head.index, b.args, a);
    if (a.tag === 'VGlued' && b.tag === 'VGlued' && conv_1.eqHead(a.head, b.head) && list_1.length(a.args) === list_1.length(b.args)) {
        try {
            metas_1.metaPush();
            list_1.zipWithR_((x, y) => unifyElim(k, x, y, a, b), a.args, b.args);
            metas_1.metaDiscard();
            return;
        }
        catch (err) {
            if (!(err instanceof TypeError))
                throw err;
            metas_1.metaPop();
            return exports.unify(k, lazy_1.forceLazy(a.val), lazy_1.forceLazy(b.val));
        }
    }
    if (a.tag === 'VGlued')
        return exports.unify(k, lazy_1.forceLazy(a.val), b);
    if (b.tag === 'VGlued')
        return exports.unify(k, a, lazy_1.forceLazy(b.val));
    return utils_1.terr(`unify failed (${k}): ${domain_1.showTermQ(a, k)} ~ ${domain_1.showTermQ(b, k)}`);
};
const solve = (k, m, spine, val) => {
    config_1.log(() => `solve ?${m} ${list_1.listToString(spine, e => domain_1.showElimQ(e, k))} := ${domain_1.showTermQ(val, k)} (${k})`);
    try {
        const spinex = checkSpine(k, spine);
        if (utils_1.hasDuplicates(list_1.toArray(spinex, x => x)))
            return utils_1.terr(`meta spine contains duplicates`);
        const rhs = domain_1.quote(val, k, false);
        const ivs = list_1.map(spinex, ([_, v]) => v);
        const body = checkSolution(k, m, ivs, rhs);
        // Note: I'm solving with an abstraction that has * as type for all the parameters
        // TODO: I think it might actually matter
        config_1.log(() => `spine ${list_1.listToString(spinex, ([p, s]) => `${p ? '-' : ''}${s}`)}`);
        const solution = list_1.foldl((body, [pl, y]) => {
            if (typeof y === 'string')
                return syntax_1.Abs(pl, '_', syntax_1.Type, body);
            return syntax_1.Abs(pl, '_', syntax_1.Type, body);
        }, body, spinex);
        config_1.log(() => `solution ?${m} := ${syntax_1.showTerm(solution)} | ${syntax_1.showTerm(solution)}`);
        const vsolution = domain_1.evaluate(solution, list_1.Nil);
        metas_1.metaSet(m, vsolution);
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        const a = list_1.toArray(spine, e => domain_1.showElimQ(e, k));
        return utils_1.terr(`failed to solve meta (?${m}${a.length > 0 ? ' ' : ''}${a.join(' ')}) := ${domain_1.showTermQ(val, k)}: ${err.message}`);
    }
};
const checkSpine = (k, spine) => list_1.map(spine, elim => {
    if (elim.tag === 'EUnsafeCast')
        return utils_1.terr(`unsafeCast in meta spine`);
    if (elim.tag === 'EFst')
        return utils_1.terr(`fst in meta spine`);
    if (elim.tag === 'ESnd')
        return utils_1.terr(`snd in meta spine`);
    if (elim.tag === 'EApp') {
        const v = domain_1.forceGlue(elim.arg);
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HVar' && list_1.length(v.args) === 0)
            return [elim.plicity, v.head.index];
        if ((v.tag === 'VNe' || v.tag === 'VGlued') && v.head.tag === 'HGlobal' && list_1.length(v.args) === 0)
            return [elim.plicity, v.head.name];
        return utils_1.terr(`not a var in spine: ${domain_1.showTermQ(v, k)}`);
    }
    return elim;
});
const checkSolution = (k, m, is, t) => {
    if (t.tag === 'Sort')
        return t;
    if (t.tag === 'Global')
        return t;
    if (t.tag === 'Var') {
        const i = k - t.index - 1;
        if (list_1.contains(is, i))
            return syntax_1.Var(list_1.indexOf(is, i));
        return utils_1.terr(`scope error ${t.index} (${i})`);
    }
    if (t.tag === 'Meta') {
        if (m === t.index)
            return utils_1.terr(`occurs check failed: ${syntax_1.showTerm(t)}`);
        return t;
    }
    if (t.tag === 'App') {
        const l = checkSolution(k, m, is, t.left);
        const r = checkSolution(k, m, is, t.right);
        return syntax_1.App(l, t.plicity, r);
    }
    if (t.tag === 'Pair') {
        const l = checkSolution(k, m, is, t.fst);
        const r = checkSolution(k, m, is, t.snd);
        const ty = checkSolution(k, m, is, t.type);
        return syntax_1.Pair(l, r, ty);
    }
    if (t.tag === 'Fst') {
        const x = checkSolution(k, m, is, t.term);
        return syntax_1.Fst(x);
    }
    if (t.tag === 'Snd') {
        const x = checkSolution(k, m, is, t.term);
        return syntax_1.Snd(x);
    }
    if (t.tag === 'Abs') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_1.Abs(t.plicity, t.name, ty, body);
    }
    if (t.tag === 'Pi') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_1.Pi(t.plicity, t.name, ty, body);
    }
    if (t.tag === 'Sigma') {
        const ty = checkSolution(k, m, is, t.type);
        const body = checkSolution(k + 1, m, list_1.Cons(k, is), t.body);
        return syntax_1.Sigma(t.name, ty, body);
    }
    if (t.tag === 'UnsafeCast') {
        const type = checkSolution(k, m, is, t.type);
        const val = checkSolution(k, m, is, t.val);
        return syntax_1.UnsafeCast(type, val);
    }
    return utils_1.impossible(`checkSolution ?${m}: non-normal term: ${syntax_1.showTerm(t)}`);
};

},{"./config":1,"./conv":2,"./domain":3,"./metas":5,"./syntax":10,"./utils/lazy":13,"./utils/list":14,"./utils/utils":15}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLazy = exports.forceLazy = exports.lazyOf = exports.Lazy = void 0;
exports.Lazy = (fn) => ({ fn, val: null, forced: false });
exports.lazyOf = (val) => ({ fn: () => val, val, forced: true });
exports.forceLazy = (lazy) => {
    if (lazy.forced)
        return lazy.val;
    const v = lazy.fn();
    lazy.val = v;
    lazy.forced = true;
    return v;
};
exports.mapLazy = (lazy, fn) => exports.Lazy(() => fn(exports.forceLazy(lazy)));

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.max = exports.contains = exports.range = exports.and = exports.zipWithR_ = exports.zipWith_ = exports.zipWith = exports.foldlprim = exports.foldrprim = exports.foldl = exports.foldr = exports.lookup = exports.extend = exports.indecesOf = exports.indexOf = exports.index = exports.mapIndex = exports.map = exports.consAll = exports.append = exports.toArrayFilter = exports.toArray = exports.reverse = exports.isEmpty = exports.length = exports.each = exports.first = exports.filter = exports.listToString = exports.list = exports.listFrom = exports.Cons = exports.Nil = void 0;
exports.Nil = { tag: 'Nil' };
exports.Cons = (head, tail) => ({ tag: 'Cons', head, tail });
exports.listFrom = (a) => a.reduceRight((x, y) => exports.Cons(y, x), exports.Nil);
exports.list = (...a) => exports.listFrom(a);
exports.listToString = (l, fn = x => `${x}`) => {
    const r = [];
    let c = l;
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return `[${r.join(', ')}]`;
};
exports.filter = (l, fn) => l.tag === 'Cons' ? (fn(l.head) ? exports.Cons(l.head, exports.filter(l.tail, fn)) : exports.filter(l.tail, fn)) : l;
exports.first = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        if (fn(c.head))
            return c.head;
        c = c.tail;
    }
    return null;
};
exports.each = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        fn(c.head);
        c = c.tail;
    }
};
exports.length = (l) => {
    let n = 0;
    let c = l;
    while (c.tag === 'Cons') {
        n++;
        c = c.tail;
    }
    return n;
};
exports.isEmpty = (l) => l.tag === 'Nil';
exports.reverse = (l) => exports.listFrom(exports.toArray(l, x => x).reverse());
exports.toArray = (l, fn) => {
    let c = l;
    const r = [];
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return r;
};
exports.toArrayFilter = (l, m, f) => {
    const a = [];
    while (l.tag === 'Cons') {
        if (f(l.head))
            a.push(m(l.head));
        l = l.tail;
    }
    return a;
};
exports.append = (a, b) => a.tag === 'Cons' ? exports.Cons(a.head, exports.append(a.tail, b)) : b;
exports.consAll = (hs, b) => exports.append(exports.listFrom(hs), b);
exports.map = (l, fn) => l.tag === 'Cons' ? exports.Cons(fn(l.head), exports.map(l.tail, fn)) : l;
exports.mapIndex = (l, fn, i = 0) => l.tag === 'Cons' ? exports.Cons(fn(i, l.head), exports.mapIndex(l.tail, fn, i + 1)) : l;
exports.index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
};
exports.indexOf = (l, x) => {
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head === x)
            return i;
        l = l.tail;
        i++;
    }
    return -1;
};
exports.indecesOf = (l, val) => {
    const a = [];
    let i = 0;
    while (l.tag === 'Cons') {
        if (l.head === val)
            a.push(i);
        l = l.tail;
        i++;
    }
    return a;
};
exports.extend = (name, val, rest) => exports.Cons([name, val], rest);
exports.lookup = (l, name, eq = (x, y) => x === y) => {
    while (l.tag === 'Cons') {
        const h = l.head;
        if (eq(h[0], name))
            return h[1];
        l = l.tail;
    }
    return null;
};
exports.foldr = (f, i, l, j = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldr(f, i, l.tail, j + 1), j);
exports.foldl = (f, i, l) => l.tag === 'Nil' ? i : exports.foldl(f, f(i, l.head), l.tail);
exports.foldrprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : f(l.head, exports.foldrprim(f, i, l.tail, ind + 1), l, ind);
exports.foldlprim = (f, i, l, ind = 0) => l.tag === 'Nil' ? i : exports.foldlprim(f, f(l.head, i, l, ind), l.tail, ind + 1);
exports.zipWith = (f, la, lb) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head), exports.zipWith(f, la.tail, lb.tail));
exports.zipWith_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        f(la.head, lb.head);
        exports.zipWith_(f, la.tail, lb.tail);
    }
};
exports.zipWithR_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        exports.zipWith_(f, la.tail, lb.tail);
        f(la.head, lb.head);
    }
};
exports.and = (l) => l.tag === 'Nil' ? true : l.head && exports.and(l.tail);
exports.range = (n) => n <= 0 ? exports.Nil : exports.Cons(n - 1, exports.range(n - 1));
exports.contains = (l, v) => l.tag === 'Cons' ? (l.head === v || exports.contains(l.tail, v)) : false;
exports.max = (l) => exports.foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasDuplicates = exports.range = exports.loadFile = exports.serr = exports.terr = exports.impossible = void 0;
exports.impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.terr = (msg) => {
    throw new TypeError(msg);
};
exports.serr = (msg) => {
    throw new SyntaxError(msg);
};
exports.loadFile = (fn) => {
    if (typeof window === 'undefined') {
        return new Promise((resolve, reject) => {
            require('fs').readFile(fn, 'utf8', (err, data) => {
                if (err)
                    return reject(err);
                return resolve(data);
            });
        });
    }
    else {
        return fetch(fn).then(r => r.text());
    }
};
exports.range = (n) => {
    const a = Array(n);
    for (let i = 0; i < n; i++)
        a[i] = i;
    return a;
};
exports.hasDuplicates = (x) => {
    const m = {};
    for (let i = 0; i < x.length; i++) {
        const y = `${x[i]}`;
        if (m[y])
            return true;
        m[y] = true;
    }
    return false;
};

},{"fs":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.showLocal = exports.localInType = exports.extend = exports.localEmpty = void 0;
const syntax_1 = require("./syntax");
const domain_1 = require("./domain");
const list_1 = require("./utils/list");
const utils_1 = require("./utils/utils");
const config_1 = require("./config");
const globalenv_1 = require("./globalenv");
const conv_1 = require("./conv");
const extendT = (ts, val, bound, plicity) => list_1.Cons({ type: val, bound, plicity }, ts);
const showEnvT = (ts, k = 0, full = false) => list_1.listToString(ts, entry => `${entry.bound ? '' : 'd '}${entry.plicity ? 'e ' : ''}${domain_1.showTermQ(entry.type, k, full)}`);
const indexT = (ts, ix) => {
    let l = ts;
    let i = 0;
    while (l.tag === 'Cons') {
        if (ix === 0)
            return [l.head, i];
        i++;
        ix--;
        l = l.tail;
    }
    return null;
};
exports.localEmpty = { names: list_1.Nil, ts: list_1.Nil, vs: list_1.Nil, index: 0, inType: false };
exports.extend = (l, name, ty, bound, plicity, val, inType = l.inType) => ({
    names: list_1.Cons(name, l.names),
    ts: extendT(l.ts, ty, bound, plicity),
    vs: domain_1.extendV(l.vs, val),
    index: l.index + 1,
    inType,
});
exports.localInType = (l, inType = true) => ({
    names: l.names,
    ts: l.ts,
    vs: l.vs,
    index: l.index,
    inType,
});
exports.showLocal = (l, full = false) => `Local(${l.index}, ${l.inType}, ${showEnvT(l.ts, l.index, full)}, ${domain_1.showEnvV(l.vs, l.index, full)}, ${list_1.listToString(l.names)})`;
const check = (local, tm, ty) => {
    config_1.log(() => `check ${syntax_1.showTerm(tm)} : ${domain_1.showTermS(ty, local.names, local.index)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    const ty2 = synth(local, tm);
    try {
        config_1.log(() => `conv ${domain_1.showTermS(ty2, local.names, local.index)} ~ ${domain_1.showTermS(ty, local.names, local.index)}`);
        conv_1.conv(local.index, ty2, ty);
        return;
    }
    catch (err) {
        if (!(err instanceof TypeError))
            throw err;
        return utils_1.terr(`failed to conv ${domain_1.showTermS(ty2, local.names, local.index)} ~ ${domain_1.showTermS(ty, local.names, local.index)}: ${err.message}`);
    }
};
const synth = (local, tm) => {
    config_1.log(() => `synth ${syntax_1.showTerm(tm)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    if (tm.tag === 'Sort')
        return domain_1.VType;
    if (tm.tag === 'Enum')
        return domain_1.VType;
    if (tm.tag === 'Global') {
        const entry = globalenv_1.globalGet(tm.name);
        if (!entry)
            return utils_1.terr(`global ${tm.name} not found`);
        return entry.type;
    }
    if (tm.tag === 'Var') {
        const i = tm.index;
        const [entry] = indexT(local.ts, i) || utils_1.terr(`var out of scope ${syntax_1.showTerm(tm)}`);
        if (entry.plicity && !local.inType)
            return utils_1.terr(`erased parameter ${syntax_1.showTerm(tm)} used`);
        return entry.type;
    }
    if (tm.tag === 'App') {
        const ty = synth(local, tm.left);
        const rty = synthapp(local, ty, tm.plicity, tm.right, tm);
        return rty;
    }
    if (tm.tag === 'Abs') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        const vtype = domain_1.evaluate(tm.type, local.vs);
        const rt = synth(exports.extend(local, tm.name, vtype, true, tm.plicity, domain_1.VVar(local.index)), tm.body);
        const pi = domain_1.evaluate(syntax_1.Pi(tm.plicity, tm.name, tm.type, domain_1.quote(rt, local.index + 1, false)), local.vs);
        return pi;
    }
    if (tm.tag === 'Let') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        const vty = domain_1.evaluate(tm.type, local.vs);
        check(local, tm.val, vty);
        const rt = synth(exports.extend(local, tm.name, vty, false, tm.plicity, domain_1.evaluate(tm.val, local.vs)), tm.body);
        return rt;
    }
    if (tm.tag === 'Pi') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        check(exports.extend(local, tm.name, domain_1.evaluate(tm.type, local.vs), true, false, domain_1.VVar(local.index)), tm.body, domain_1.VType);
        return domain_1.VType;
    }
    if (tm.tag === 'Sigma') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        check(exports.extend(local, tm.name, domain_1.evaluate(tm.type, local.vs), true, false, domain_1.VVar(local.index)), tm.body, domain_1.VType);
        return domain_1.VType;
    }
    if (tm.tag === 'Pair') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        const vt = domain_1.evaluate(tm.type, local.vs);
        const vtf = domain_1.force(vt);
        if (vtf.tag !== 'VSigma')
            return utils_1.terr(`Pair with non-sigma type: ${syntax_1.showTerm(tm)}`);
        check(local, tm.fst, vtf.type);
        check(local, tm.snd, vtf.body(domain_1.evaluate(tm.fst, local.vs)));
        return vt;
    }
    if (tm.tag === 'UnsafeCast') {
        check(exports.localInType(local), tm.type, domain_1.VType);
        const vt = domain_1.evaluate(tm.type, local.vs);
        synth(local, tm.val);
        return vt;
    }
    if (tm.tag === 'Fst') {
        const ty = synth(local, tm.term);
        const fty = domain_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in fst: ${syntax_1.showTerm(tm)}`);
        return fty.type;
    }
    if (tm.tag === 'Snd') {
        const ty = synth(local, tm.term);
        const fty = domain_1.force(ty);
        if (fty.tag !== 'VSigma')
            return utils_1.terr(`not a sigma type in snd: ${syntax_1.showTerm(tm)}`);
        return fty.body(domain_1.vfst(domain_1.evaluate(tm.term, local.vs)));
    }
    return utils_1.terr(`cannot synth ${syntax_1.showTerm(tm)}`);
};
const synthapp = (local, ty_, plicity, tm, tmall) => {
    config_1.log(() => `synthapp ${domain_1.showTermS(ty_, local.names, local.index)} ${plicity ? '-' : ''}@ ${syntax_1.showTerm(tm)}${config_1.config.showEnvs ? ` in ${exports.showLocal(local)}` : ''}`);
    const ty = domain_1.force(ty_);
    if (ty.tag === 'VPi' && ty.plicity === plicity) {
        check(plicity ? exports.localInType(local) : local, tm, ty.type);
        const rt = ty.body(domain_1.evaluate(tm, local.vs));
        return rt;
    }
    return utils_1.terr(`invalid type or plicity mismatch in synthapp in ${syntax_1.showTerm(tmall)}: ${domain_1.showTermQ(ty, local.index)} ${plicity ? '-' : ''}@ ${syntax_1.showTerm(tm)}`);
};
exports.verify = (tm) => {
    const ty = synth(exports.localEmpty, tm);
    return ty;
};

},{"./config":1,"./conv":2,"./domain":3,"./globalenv":4,"./syntax":10,"./utils/list":14,"./utils/utils":15}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repl_1 = require("./repl");
var hist = [], index = -1;
var input = document.getElementById('input');
var content = document.getElementById('content');
function onresize() {
    content.style.height = window.innerHeight;
}
window.addEventListener('resize', onresize);
onresize();
addResult('tinka repl');
repl_1.initREPL();
input.focus();
input.onkeydown = function (keyEvent) {
    var val = input.value;
    var txt = (val || '').trim();
    if (keyEvent.keyCode === 13) {
        keyEvent.preventDefault();
        if (txt) {
            hist.push(val);
            index = hist.length;
            input.value = '';
            var div = document.createElement('div');
            div.innerHTML = val;
            div.className = 'line input';
            content.insertBefore(div, input);
            repl_1.runREPL(txt, addResult);
        }
    }
    else if (keyEvent.keyCode === 38 && index > 0) {
        keyEvent.preventDefault();
        input.value = hist[--index];
    }
    else if (keyEvent.keyCode === 40 && index < hist.length - 1) {
        keyEvent.preventDefault();
        input.value = hist[++index];
    }
    else if (keyEvent.keyCode === 40 && keyEvent.ctrlKey && index >= hist.length - 1) {
        index = hist.length;
        input.value = '';
    }
};
function addResult(msg, err) {
    var divout = document.createElement('pre');
    divout.className = 'line output';
    if (err)
        divout.className += ' error';
    divout.innerHTML = '' + msg;
    content.insertBefore(divout, input);
    input.focus();
    content.scrollTop = content.scrollHeight;
    return divout;
}

},{"./repl":8}],18:[function(require,module,exports){

},{}]},{},[17]);
