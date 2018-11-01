import * as main from './main';

describe('a canary', () => {
  it('should survive a coal mine', () => {
    expect(true).toBe(true);
  });
});

describe('main', () => {
  it('should exist', () => {
    expect(main).toBeDefined();
  });
});
