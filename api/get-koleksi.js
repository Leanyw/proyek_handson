import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

// Inisialisasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inisialisasi Redis (gunakan URL dari environment)
const redisUrl = process.env.REDIS_URL;
const redis = createRedisClient({ url: redisUrl });
await redis.connect();

export default async function handler(req, res) {
  const cacheKey = 'koleksi:all';

  try {
    // Cek Redis
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache hit');
      return res.status(200).json(JSON.parse(cached));
    }

    // Ambil dari Supabase
    console.log('Cache miss, fetching from Supabase');
    const { data, error } = await supabase
      .from('koleksi')
      .select('id, judul, path') // hanya ambil yang diperlukan untuk katalog
      .order('id');

    if (error) throw error;

    // Simpan ke Redis dengan TTL 60 detik (sesuai selera)
    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 });

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  } finally {
    // Jangan tutup koneksi redis karena bisa dipakai lagi
  }
}