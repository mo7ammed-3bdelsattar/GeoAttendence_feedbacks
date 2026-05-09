import { db } from '../server/config/firebase-admin';

async function test() {
  try {
    await db.collection('test').add({ test: true });
    console.log('Write successful!');
  } catch (e) {
    console.error('Write failed:', e);
  }
}

test();
