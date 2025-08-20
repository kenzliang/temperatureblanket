export type WeatherRow = { location: string; state: string; highTempF: number; rained: boolean; snowed: boolean };
export type CheckRow = { personId: string; name: string; location: string; completed: boolean };

export async function getWeather(date: string): Promise<WeatherRow[]> {
  const r = await fetch(`/api/weather?date=${date}`);
  if (!r.ok) throw new Error('weather fetch failed');
  return r.json();
}

export async function getChecks(date: string): Promise<CheckRow[]> {
  const r = await fetch(`/api/checks?date=${date}`);
  if (!r.ok) throw new Error('checks fetch failed');
  return r.json();
}

export async function setCheck(date: string, personId: string, completed: boolean) {
  const r = await fetch('/api/checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, personId, completed })
  });
  if (!r.ok) throw new Error('update failed');
}