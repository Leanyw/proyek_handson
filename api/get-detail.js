import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const redisUrl = process.env.REDIS_URL;
const redis = createRedisClient({ url: redisUrl });
await redis.connect();

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Parameter id diperlukan' });
  }

  const cacheKey = `koleksi:detail:${id}`;

  try {
    // Cek Redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache hit for detail', id);
      return res.status(200).json(JSON.parse(cached));
    }

    // Ambil dari Supabase
    console.log('Cache miss for detail', id);
    const { data, error } = await supabase
      .from('koleksi')
      .select('judul, pencipta, tahun, harga')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Simpan ke Redis dengan TTL 60 detik
    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 });

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil detail' });
  }
}