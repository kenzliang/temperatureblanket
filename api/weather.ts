import { VercelRequest, VercelResponse } from '@vercel/node';
import { supaAnon } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const d = (req.query.date as string) || new Date().toISOString().slice(0,10);
  // Require auth: check Supabase JWT cookie if using Supabase Auth via middleware (optional).
  try {
    const { data, error } = await supaAnon
      .rpc('get_weather_for_date', { d_in: d });
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}