const sendgrid = require('@sendgrid/mail');
const shared = require('/opt/nodejs/index');

exports.handler = async (state) => {
  try {
    const apiKey = await shared.getSecret('sendgrid');
    sendgrid.setApiKey(apiKey);

    let { to, subject, html, text } = state;
    if(state.detail){
      to = state.detail.to;
      subject = state.detail.subject;
      html = state.detail.html;
      text = state.detail.text;
    }
    
    await sendMessage(to, subject, html, text);
  } catch (err) {
    console.error(err);
  }
};

const sendMessage = async (to, subject, html, text) => {
  const msg = {
    to: to,
    from: process.env.FROM_EMAIL,
    subject: subject,
    ...html && {
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    },
    ...text && { text: text }
  };

  await sendgrid.send(msg);
};