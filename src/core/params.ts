import { isGameState, type GameState } from './state';

/** Review options read from the URL, e.g. `?debug=1&state=round&round=5&seed=123`. */
export interface UrlParams {
  debug: boolean;
  state: GameState | null;
  round: number | null;
  seed: number | null;
}

function parseInteger(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  return Number(value);
}

export function parseUrlParams(search: string): UrlParams {
  const params = new URLSearchParams(search);
  const state = params.get('state');
  return {
    debug: params.get('debug') === '1',
    state: state !== null && isGameState(state) ? state : null,
    round: parseInteger(params.get('round')),
    seed: parseInteger(params.get('seed')),
  };
}
