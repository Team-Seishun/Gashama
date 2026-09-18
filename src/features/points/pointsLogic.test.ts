import { describe, expect, it } from '@jest/globals';
import {
  POINTS_PER_TRADE_LIMIT,
  isPointsUnavailable,
  isSubmitBlockedByPoints,
  computeMaxPointsUsed,
  isStepperDecrementDisabled,
  isStepperIncrementDisabled,
  decrementPointsUsed,
  incrementPointsUsed,
  resolvePointsBalance,
} from './pointsLogic';

describe('POINTS_PER_TRADE_LIMIT', () => {
  it('RPC側と同じ20ポイントを上限とする', () => {
    expect(POINTS_PER_TRADE_LIMIT).toBe(20);
  });
});

describe('isPointsUnavailable', () => {
  it('残高が未取得(null)のときはtrue', () => {
    expect(isPointsUnavailable(null)).toBe(true);
  });

  it('残高が0のときはtrue', () => {
    expect(isPointsUnavailable(0)).toBe(true);
  });

  it('残高が1以上のときはfalse', () => {
    expect(isPointsUnavailable(1)).toBe(false);
    expect(isPointsUnavailable(20)).toBe(false);
  });
});

describe('isSubmitBlockedByPoints', () => {
  it('残高が0で未ログインでない場合はブロックする', () => {
    expect(isSubmitBlockedByPoints(0, false)).toBe(true);
  });

  it('残高がnull(未取得)で未ログインでない場合はブロックする', () => {
    expect(isSubmitBlockedByPoints(null, false)).toBe(true);
  });

  it('未ログインの場合は残高がnullでもブロックしない(handleSubmit側の認証エラーに委ねる)', () => {
    expect(isSubmitBlockedByPoints(null, true)).toBe(false);
  });

  it('未ログインの場合は残高が0でもブロックしない(handleSubmit側の認証エラーに委ねる)', () => {
    expect(isSubmitBlockedByPoints(0, true)).toBe(false);
  });

  it('残高が1以上ならログイン状態に関わらずブロックしない', () => {
    expect(isSubmitBlockedByPoints(5, false)).toBe(false);
    expect(isSubmitBlockedByPoints(5, true)).toBe(false);
  });
});

describe('computeMaxPointsUsed', () => {
  it('残高が未取得(null)のときは0', () => {
    expect(computeMaxPointsUsed(null)).toBe(0);
  });

  it('残高が上限未満のときは残高そのもの', () => {
    expect(computeMaxPointsUsed(0)).toBe(0);
    expect(computeMaxPointsUsed(5)).toBe(5);
  });

  it('残高が上限以上のときは上限値(20)でクランプされる', () => {
    expect(computeMaxPointsUsed(POINTS_PER_TRADE_LIMIT)).toBe(POINTS_PER_TRADE_LIMIT);
    expect(computeMaxPointsUsed(21)).toBe(POINTS_PER_TRADE_LIMIT);
    expect(computeMaxPointsUsed(1000)).toBe(20);
  });

  it('上限値を明示的に渡せる', () => {
    expect(computeMaxPointsUsed(30, 10)).toBe(10);
  });

  it('明示的な上限より残高が少ないときは残高を返す', () => {
    expect(computeMaxPointsUsed(9, 10)).toBe(9);
  });
});

describe('isStepperDecrementDisabled', () => {
  it('残高が無い場合は無効化', () => {
    expect(isStepperDecrementDisabled(null, 1)).toBe(true);
    expect(isStepperDecrementDisabled(0, 1)).toBe(true);
  });

  it('pointsUsedが1のときは無効化(下限)', () => {
    expect(isStepperDecrementDisabled(10, 1)).toBe(true);
    expect(isStepperDecrementDisabled(10, 0)).toBe(true);
  });

  it('pointsUsedが2以上のときは有効', () => {
    expect(isStepperDecrementDisabled(10, 2)).toBe(false);
  });
});

describe('isStepperIncrementDisabled', () => {
  it('残高が無い場合は無効化', () => {
    expect(isStepperIncrementDisabled(null, 1, 0)).toBe(true);
    expect(isStepperIncrementDisabled(0, 1, 0)).toBe(true);
  });

  it('pointsUsedがmaxPointsUsedに達しているときは無効化(上限)', () => {
    expect(isStepperIncrementDisabled(5, 5, 5)).toBe(true);
    expect(isStepperIncrementDisabled(5, 6, 5)).toBe(true);
  });

  it('pointsUsedがmaxPointsUsed未満のときは有効', () => {
    expect(isStepperIncrementDisabled(5, 3, 5)).toBe(false);
  });
});

describe('decrementPointsUsed', () => {
  it('下限以下の値からでも1未満には下がらない', () => {
    expect(decrementPointsUsed(1)).toBe(1);
    expect(decrementPointsUsed(0)).toBe(1);
    expect(decrementPointsUsed(-5)).toBe(1);
  });

  it('通常は1減る', () => {
    expect(decrementPointsUsed(5)).toBe(4);
  });
});

describe('incrementPointsUsed', () => {
  it('上限以上の値からでもmaxPointsUsedを超えない', () => {
    expect(incrementPointsUsed(20, 20)).toBe(20);
    expect(incrementPointsUsed(21, 20)).toBe(20);
  });

  it('通常は1増える', () => {
    expect(incrementPointsUsed(5, 20)).toBe(6);
  });

  it('maxPointsUsedが0(残高無し)でも上限を超えない', () => {
    expect(incrementPointsUsed(0, 0)).toBe(0);
  });
});

describe('resolvePointsBalance', () => {
  it('undefinedのときは0', () => {
    expect(resolvePointsBalance(undefined)).toBe(0);
  });

  it('nullのときは0', () => {
    expect(resolvePointsBalance(null)).toBe(0);
  });

  it('0のときは0のまま(存在しない扱いにしない)', () => {
    expect(resolvePointsBalance(0)).toBe(0);
  });

  it('正の値はそのまま返す', () => {
    expect(resolvePointsBalance(42)).toBe(42);
  });
});
