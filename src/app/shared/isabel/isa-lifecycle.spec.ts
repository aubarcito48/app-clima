import { afterEach, describe, expect, it, vi } from 'vitest';
import { IsaLifecycle } from './isa-lifecycle';

describe('Isa wake, speech and sleep sequence', () => {
  afterEach(() => vi.useRealTimers());

  it('looks right while preparing, briefly enlarges eyes while speaking, then rests five seconds', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    const lifecycle = new IsaLifecycle(change);
    lifecycle.update(false, 'idle');
    expect(change).not.toHaveBeenCalled();
    lifecycle.update(true, 'idle');
    expect(change).toHaveBeenLastCalledWith('awake');
    lifecycle.update(false, 'loading');
    expect(change).toHaveBeenLastCalledWith('right');
    lifecycle.update(false, 'speaking');
    expect(change).toHaveBeenLastCalledWith('front');
    vi.advanceTimersByTime(450);
    expect(change).toHaveBeenLastCalledWith('expressive');
    vi.advanceTimersByTime(900);
    expect(change).toHaveBeenLastCalledWith('front');
    vi.advanceTimersByTime(2000);
    expect(change).toHaveBeenLastCalledWith('front');
    lifecycle.update(false, 'idle');
    expect(change).toHaveBeenLastCalledWith('resting');
    vi.advanceTimersByTime(4999);
    expect(change).toHaveBeenLastCalledWith('resting');
    vi.advanceTimersByTime(1);
    expect(change).toHaveBeenLastCalledWith('sleeping');
    lifecycle.destroy();
  });

  it('cancels old gestures and sleep timers when silenced, queried again or destroyed', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    const lifecycle = new IsaLifecycle(change);
    lifecycle.update(false, 'speaking');
    lifecycle.update(false, 'idle');
    vi.advanceTimersByTime(2000);
    expect(change).toHaveBeenLastCalledWith('resting');
    lifecycle.update(true, 'idle');
    vi.advanceTimersByTime(5000);
    expect(change).toHaveBeenLastCalledWith('awake');
    lifecycle.update(false, 'speaking');
    lifecycle.destroy();
    change.mockClear();
    vi.runAllTimers();
    expect(change).not.toHaveBeenCalled();
  });
});
