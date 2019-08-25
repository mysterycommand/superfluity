describe('a canary', () => {
  it('should survive a coal mine', () => {
    expect(true).toBe(true);
  });
});

/**
 * this seems utterly dumb, but `ts-jest` appears to be ignoring the preset in
 * `jest.config.js` which *should* set `isolatedModules` to false for test files
 *
 * @see: https://kulshekhar.github.io/ts-jest/user/config/#jest-preset
 * @see: https://stackoverflow.com/questions/56577201/why-is-isolatedmodules-error-fixed-by-any-import
 */
export {};
