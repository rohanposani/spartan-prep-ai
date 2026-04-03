// Local development server — wraps the Vercel serverless function
const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  ✦ Spartan Prep AI server running at http://localhost:${PORT}`);
  console.log('  ✦ Open http://localhost:' + PORT + ' in your browser\n');
});
