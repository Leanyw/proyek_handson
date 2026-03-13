import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

// Inisialisasi Supabase dari environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inisialisasi Redis
const redisUrl = process.env.REDIS_URL;
const redis = createRedisClient({ url: redisUrl });
await redis.connect();

export default async function handler(req, res) {
  const cacheKey = 'koleksi:all';

  try {
    // 1. Cek apakah data sudah ada di Redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('🚀 Redis HIT - mengembalikan data dari cache');
      // Set header untuk memudahkan debugging (opsional)
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(JSON.parse(cached));
    }

    // 2. Jika tidak ada di Redis, ambil dari Supabase
    console.log('❌ Redis MISS - mengambil dari Supabase');
    const { data, error } = await supabase
      .from('koleksi')
      .select('id, judul, path')
      .order('id');

    if (error) throw error;

    // 3. Simpan hasil ke Redis dengan waktu kadaluarsa 60 detik
    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 });

    // 4. Kirim response
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
}