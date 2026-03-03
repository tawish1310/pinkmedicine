import app from './app';

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api/research/combined/search`);
  console.log(`🏥 Women's Medication Research API v1.0.0 (Live API Mode)\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
