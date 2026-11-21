const authService = require('./src/services/auth.service');

async function test() {
  console.log('--- Testing password: "A chudh@2005" ---');
  const res1 = await authService.login({ email: 'achudhshaji@gmail.com', password: 'A chudh@2005' });
  console.log('SUCCESS! Logged in as:', res1.user.name, 'Role:', res1.user.role);

  console.log('--- Testing password: "Achudh@2005" ---');
  const res2 = await authService.login({ email: 'achudhshaji@gmail.com', password: 'Achudh@2005' });
  console.log('SUCCESS! Logged in as:', res2.user.name, 'Role:', res2.user.role);

  process.exit(0);
}

test().catch(err => {
  console.error('Login test error:', err.message);
  process.exit(1);
});
