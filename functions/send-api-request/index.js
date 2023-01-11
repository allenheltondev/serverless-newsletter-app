const axios = require('axios').default;
const shared = require('/opt/nodejs/index');

exports.handler = async (state) => {
  const authToken = await shared.getSecret(state.secretKey);
  if (!authToken) {
    throw new Error('Unable to get secret');
  }

  const config = getAxiosConfig(state, authToken);
  const response = await axios.request(config);
  return response.data;
};

const getAxiosConfig = (state, authToken) => {
  const config = {
    method: state.request.method,
    baseURL: state.request.baseUrl,
    headers: state.request.headers ?? {},
    ...state.request.body && { data: state.request.body },
    responseType: 'json',
    validateStatus: (status) => status < 400
  };

  let authValue = authToken;
  if (state.auth.prefix) {
    authValue = `${state.auth.prefix} ${authToken}`;
  }

  if (state.auth.location == 'query') {
    config.baseURL = `${config.baseURL}?${state.auth.key}=${authValue}`;
  } else if (state.auth.location == 'header') {
    config.headers[state.auth.key] = authValue;
  }

  if (state.request.query) {
    const query = Object.entries(state.request.query).map(entry => `${entry[0]}=${entry[1]}`).join('&');
    if (config.baseURL.includes('?')) {
      config.baseURL = `${config.baseURL}&${query}`;
    } else {
      config.baseURL = `${config.baseURL}?${query}`;
    }
  }

  return config;
};