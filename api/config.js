// Vercel serverless function — returns the PUBLIC Supabase URL + anon key
// from environment variables so no key ever needs to be hardcoded into
// the site's files. The anon key is safe for the browser by design
// (row-level security policies do the real access control).
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
};
