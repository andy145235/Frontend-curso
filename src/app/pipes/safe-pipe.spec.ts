import { SafePipe } from './safe-pipe';

describe('SafePipe', () => {
  it('create an instance', () => {
    let pipe: SafePipe;
    pipe = new SafePipe(undefined);
    expect(pipe).toBeTruthy();
  });
});
