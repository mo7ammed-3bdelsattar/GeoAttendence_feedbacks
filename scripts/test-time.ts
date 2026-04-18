import https from 'https';
import mockdate from 'mockdate';

https.get('https://www.googleapis.com', (res) => {
  const dateHeader = res.headers.date;
  if (dateHeader) {
    const googleTime = new Date(dateHeader).getTime();
    const localTime = Date.now();
    const offset = googleTime - localTime;
    
    console.log(`Google Time: ${new Date(googleTime).toISOString()}`);
    console.log(`Local Time: ${new Date(localTime).toISOString()}`);
    console.log(`Offset: ${offset}ms`);
    
    // Apply the offset
    const OriginalDate = Date;
    global.Date = class extends OriginalDate {
      constructor(...args: any[]) {
        super(...args as []);
        if (args.length === 0) {
          return new OriginalDate(OriginalDate.now() + offset);
        }
        return new OriginalDate(...args as []);
      }
      static now() {
        return OriginalDate.now() + offset;
      }
    } as any;
    
    // Now trigger firestore
    setTimeout(async () => {
      try {
        const { db } = await import('../server/config/firebase-admin.ts');
        console.log('Testing Firestore connection...');
        await db.collection('users').limit(1).get();
        console.log('Firestore connection SUCCESS!');
        process.exit(0);
      } catch (e) {
        console.error('Firestore Error:', e);
        process.exit(1);
      }
    }, 500);
  }
});
