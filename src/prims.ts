import { PrimName } from './surface';
import { Val, VPrim, VPi, vapp, VType, vheq, VNat, VNatLit, vsucc, VFin, VFinLit, vfsucc, VIFix } from './domain';
import { impossible } from './utils/utils';

const primTypes: { [K in PrimName]: () => Val } = {
  // {A : *} -> {B : *} -> A -> B -> *
  'HEq': () => VPi(true, 'A', VType, A => VPi(true, 'B', VType, B => VPi(false, '_', A, _ => VPi(false, '_', B, _ => VType)))),
  // {A : *} -> {a : A} -> HEq {A} {A} a a
  'ReflHEq': () => VPi(true, 'A', VType, A => VPi(true, 'a', A, a => vheq(A, A, a, a))),
  // {A : *} -> {a : A} -> {P : (b : A) -> HEq {A} {A} a b -> *} -> P a (ReflHEq {A} {a}) -> {b : A} -> (p : HEq {A} {A} a b) -> P b p
  'elimHEq': () =>
    VPi(true, 'A', VType, A =>
    VPi(true, 'a', A, a =>
    VPi(true, 'P', VPi(false, 'b', A, b => VPi(false, '_', vheq(A, A, a, b), _ => VType)), P =>
    VPi(false, '_', vapp(vapp(P, false, a), false, vapp(vapp(VPrim('ReflHEq'), true, A), true, a)), _ =>
    VPi(true, 'b', A, b =>
    VPi(false, 'p', vheq(A, A, a, b), p =>
    vapp(vapp(P, false, b), false, p))))))),
  // {A : *} -> {a : A} -> {P : (b : A) -> HEq {A} {A} a b -> *} -> P a (ReflHEq {A} {a}) -> {b : A} -> {p : HEq {A} {A} a b} -> P b p
  'unsafeElimHEq': () =>
    VPi(true, 'A', VType, A =>
    VPi(true, 'a', A, a =>
    VPi(true, 'P', VPi(false, 'b', A, b => VPi(false, '_', vheq(A, A, a, b), _ => VType)), P =>
    VPi(false, '_', vapp(vapp(P, false, a), false, vapp(vapp(VPrim('ReflHEq'), true, A), true, a)), _ =>
    VPi(true, 'b', A, b =>
    VPi(true, 'p', vheq(A, A, a, b), p =>
    vapp(vapp(P, false, b), false, p))))))),

  'Nat': () => VType,
  'S': () => VPi(false, '_', VNat, _ => VNat),
  /*
  {P : Nat -> *}
    -> P Z
    -> (((k : Nat) -> P k) -> (m : Nat) -> P (S m))
    -> (n : Nat)
    -> P n
  */
  'genindNat': () =>
    VPi(true, 'P', VPi(false, '_', VNat, _ => VType), P =>
    VPi(false, '_', vapp(P, false, VNatLit(0n)), _ =>
    VPi(false, '_', VPi(false, '_', VPi(false, 'k', VNat, k => vapp(P, false, k)), _ => VPi(false, 'm', VNat, m => vapp(P, false, vsucc(m)))), _ =>
    VPi(false, 'n', VNat, n =>
    vapp(P, false, n))))),

  // Fin : Nat -> *
  'Fin': () => VPi(false, '_', VNat, _ => VType),
  // FS : {n : Nat} -> Fin n -> Fin (S n)
  'FS': () => VPi(true, 'n', VNat, n => VPi(false, '_', vapp(VFin, false, n), _ => vapp(VFin, false, vsucc(n)))),
  /*
  genindFin :
    {P : (i : Nat) -> Fin i -> *}
    -> ({n : Nat} -> P (S n) (FZ {n}))
    -> (({i : Nat} -> (x : Fin i) -> P i x) -> {n : Nat} -> (y : Fin n) -> P (S n) (FS {n} y))
    -> {n : Nat}
    -> (x : Fin n)
    -> P n x
  */
  'genindFin': () =>
    VPi(true, 'P', VPi(false, 'i', VNat, i => VPi(false, '_', vapp(VFin, false, i), _ => VType)), P =>
    VPi(false, '_', VPi(true, 'n', VNat, n => vapp(vapp(P, false, vsucc(n)), false, VFinLit(0n, n))), _ =>
    VPi(false, '_',
      VPi(false, '_', VPi(true, 'i', VNat, i => VPi(false, 'x', vapp(VFin, false, i), x => vapp(vapp(P, false, i), false, x))), _ =>
      VPi(true, 'n', VNat, n =>
      VPi(false, 'y', vapp(VFin, false, n), y =>
      vapp(vapp(P, false, vsucc(n)), false, vfsucc(n, y))))), _ =>
    VPi(true, 'n', VNat, n =>
    VPi(false, 'x', vapp(VFin, false, n), x =>
    vapp(vapp(P, false, n), false, x)))))),

  'IFix': () => VPi(false, 'I', VType, I => VPi(false, '_', VPi(false, '_', VPi(false, '_', I, _ => VType), _ => VPi(false, '_', I, _ => VType)), _ => VPi(false, '_', I, _ => VType))),
  'IIn': () =>
    VPi(true, 'I', VType, I =>
    VPi(true, 'F', VPi(false, '_', VPi(false, '_', I, _ => VType), _ => VPi(false, '_', I, _ => VType)), F =>
    VPi(true, 'i', I, i =>
    VPi(false, '_', vapp(vapp(F, false, vapp(vapp(VIFix, false, I), false, F)), false, i), _ =>
    vapp(vapp(vapp(VIFix, false, I), false, F), false, i))))),
  /*
    genindIFix
    : {I : *}
    -> {F : (I -> *) -> (I -> *)}
    -> {P : (i : I) -> IFix I F i -> P}
    -> (
      ({i : I} -> (y : IFix I F i) -> P i y)
      -> {i : I}
      -> (z : F (IFix I F) i)
      -> P i (IIn {I} {F} {i} z)
    )
    -> {i : I}
    -> (x : IFix I F i)
    -> P i x
  */
  'genindIFix': () =>
    VPi(true, 'I', VType, I =>
    VPi(true, 'F', VPi(false, '_', VPi(false, '_', I, _ => VType), _ => VPi(false, '_', I, _ => VType)), F =>
    VPi(true, 'P', VPi(false, 'i', I, i => VPi(false, '_', vapp(vapp(vapp(VIFix, false, I), false, F), false, i), _ => VType)), P =>
    VPi(false, '_',
      VPi(false, '_', VPi(true, 'i', I, i => VPi(false, 'y', vapp(vapp(vapp(VIFix, false, I), false, F), false, i), y => vapp(vapp(P, false, i), false, y))), _ =>
      VPi(true, 'i', I, i =>
      VPi(false, 'z', vapp(vapp(F, false, vapp(vapp(VIFix, false, I), false, F)), false, i), z =>
      vapp(vapp(P, false, i), false, vapp(vapp(vapp(vapp(VPrim('IIn'), true, I), true, F), true, i), false, z)))))
    , _ =>
    VPi(true, 'i', I, i =>
    VPi(false, 'x', vapp(vapp(vapp(VIFix, false, I), false, F), false, i), x =>
    vapp(vapp(P, false, i), false, x))))))),
};

export const primType = (name: PrimName): Val => primTypes[name]() || impossible(`primType: ${name}`);
