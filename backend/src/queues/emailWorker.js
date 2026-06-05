const { Worker, QUEUE_NAMES, connection } = require('../config/queues');
const { sendMail } = require('../utils/mailer');

let emailWorker = null;

const startEmailWorker = () => {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const { to, subject, html } = job.data;

      if (!to || !subject || !html) {
        throw new Error(`Invalid email job payload: missing to/subject/html`);
      }

      console.log(`[EmailWorker] Sending email to ${to} | subject: "${subject}"`);
      await sendMail({ to, subject, html });
      console.log(`[EmailWorker] Email sent to ${to}`);
    },
    {
      connection,
      concurrency: 5,   // process up to 5 emails in parallel
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  console.log('[EmailWorker] Started');
  return emailWorker;
};

module.exports = { startEmailWorker, emailWorker: () => emailWorker };