const sendgrid = require('@sendgrid/client');
const shared = require('/opt/nodejs/index');

exports.handler = async (event) => {
  try{
    const apiKey = await shared.getSecret('sendgrid');
    const contact = JSON.parse(event.body);
    await addContact(apiKey, contact);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Contact added' }),
      headers: { 'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGIN }
    }
  }
  catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }), 
      headers: { 'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGIN }
    }
  }  
};

const addContact = async (apiKey, contact) => {
  sendgrid.setApiKey(apiKey);
  const contactData = {
    list_ids: [ process.env.LIST_ID ],
    contacts: [
      {
        email: contact.email,
        ...contact.firstName && { first_name: contact.firstName },
        ...contact.lastName && { last_name: contact.lastName }
      }      
    ]    
  };

  const request = {
    url: `/v3/marketing/contacts`,
    method: 'PUT',
    body: contactData
  };

  await sendgrid.request(request);
};