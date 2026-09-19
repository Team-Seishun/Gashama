import { describe, expect, it } from '@jest/globals';
import { filterTradeableInventories, filterUntradedInventories } from './myInventoryLogic';

describe('filterUntradedInventories', () => {
  it('tradedReportIdsが空なら全件そのまま返す', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }];
    expect(filterUntradedInventories(inventories, [])).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('tradedReportIdsに含まれるidの在庫を除外する', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(filterUntradedInventories(inventories, ['b'])).toEqual([{ id: 'a' }, { id: 'c' }]);
  });

  it('複数のidを同時に除外できる', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(filterUntradedInventories(inventories, ['a', 'c'])).toEqual([{ id: 'b' }]);
  });

  it('tradedReportIdsに重複があっても正しく除外する', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }];
    expect(filterUntradedInventories(inventories, ['a', 'a', 'a'])).toEqual([{ id: 'b' }]);
  });

  it('在庫が空配列なら空配列を返す', () => {
    expect(filterUntradedInventories([], ['a'])).toEqual([]);
  });

  it('全てtradedReportIdsに含まれる場合は空配列を返す', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }];
    expect(filterUntradedInventories(inventories, ['a', 'b'])).toEqual([]);
  });

  it('inventories配下に余分なプロパティがあっても保持したまま返す（idだけで判定する）', () => {
    const inventories = [{ id: 'a', name: 'こん玉' }, { id: 'b', name: 'ロボピー' }];
    expect(filterUntradedInventories(inventories, ['a'])).toEqual([{ id: 'b', name: 'ロボピー' }]);
  });

  it('元の配列を変更しない', () => {
    const inventories = [{ id: 'a' }, { id: 'b' }];
    const original = [...inventories];
    filterUntradedInventories(inventories, ['a']);
    expect(inventories).toEqual(original);
  });
});

describe('filterTradeableInventories', () => {
  it('未トレード化かつitem_idがある在庫のみを返す', () => {
    const inventories = [
      { id: 'a', item_id: 'item-1' },
      { id: 'b', item_id: null },
      { id: 'c', item_id: 'item-2' },
    ];
    expect(filterTradeableInventories(inventories, [])).toEqual([
      { id: 'a', item_id: 'item-1' },
      { id: 'c', item_id: 'item-2' },
    ]);
  });

  it('item_idがあってもトレード募集済み(tradedReportIdsに含まれる)なら除外する', () => {
    const inventories = [
      { id: 'a', item_id: 'item-1' },
      { id: 'b', item_id: 'item-2' },
    ];
    expect(filterTradeableInventories(inventories, ['a'])).toEqual([
      { id: 'b', item_id: 'item-2' },
    ]);
  });

  it('item_idがnullの在庫は未トレード化でも除外する', () => {
    const inventories = [{ id: 'a', item_id: null }];
    expect(filterTradeableInventories(inventories, [])).toEqual([]);
  });

  it('該当する在庫が無ければ空配列を返す', () => {
    const inventories = [{ id: 'a', item_id: null }, { id: 'b', item_id: 'item-1' }];
    expect(filterTradeableInventories(inventories, ['b'])).toEqual([]);
  });
});
