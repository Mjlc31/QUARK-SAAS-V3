import { spinAgent } from './spinAgent.js';
(async () => {
  const reply = await spinAgent.generateReply('123@s.whatsapp.net', 'Test', 'Hello');
  console.log(reply);
})();
