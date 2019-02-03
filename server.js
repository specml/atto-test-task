const request = require('request-promise');
const util = require('util');
const Promise = require('bluebird');
const logger = require('./lib/logger')(module);
const uuid = require('uuid/v4');

const WebSocket = require('ws');

const PORT = 5000;
const URI = 'https://api.coincap.io/v2/assets';

const clients = {};

const server = new WebSocket.Server({ port: PORT});

logger.debug(`Server started. Listening port ${PORT}`);

const getCurrencyRates = () => {
  const options = {
    uri: URI,
    method: 'GET',
    json: true
  };

  return request(options)
    .then((response_body) => Promise.resolve(response_body.data))
    .catch((error) => {
      logger.error(`Request error\n${util.inspect(error, null, 10)}`);

      return Promise.reject(error);
    });
};

const extractTopNCurrencies = (source_array, quantity, field_name = null) => {
  return source_array.sort((a,b) => parseInt(field_name ? a[field_name] : a) - parseInt(field_name ? b[field_name] : b)).slice(0, quantity);
};

const clearCurrencyRates = (source_array) => {
  const model = {
    name: null,
    priceUsd: null
  };

  return source_array.reduce((accumulator, rate) => {
    accumulator.push(Object.keys(model).reduce((lower_accumulator, key) => {
      if (key === 'priceUsd') {
        lower_accumulator.priceUsd = Math.round(parseFloat(rate.priceUsd) * 100) / 100;
      } else {
        lower_accumulator[key] = rate[key];
      }

      return lower_accumulator
    }, {}));

    return accumulator
  }, []);
};

const refreshRates = (who_will_send = {}) => {
  getCurrencyRates()
    .then((raw_rates) => Promise.resolve(extractTopNCurrencies(raw_rates, 5, 'rank')))
    .then((top_raw_rates) => {
      const clear_rates = clearCurrencyRates(top_raw_rates);

      who_will_send.send(JSON.stringify({ action: 'refresh', data: clear_rates }));
    });
};

const handleMessage = (message) => {
  logger.info(`Message received:\n${util.inspect(message, null, 10)}`);

  if (Array.isArray(message)) message.forEach((item) => handleMessage(item));

  if (!message.connection_id) {
    logger.warn(`Unknown connection\n${util.inspect(message, null, 10)}`);

    return;
  }

  const client = clients[message.connection_id];

  switch (message.action) {
    case 'refresh':
      refreshRates(client);
      break;
    default:
      logger.warn(`Unknown action\n${util.inspect(message, null, 10)}`);
  }
};

server.on('connection', (ws) => {
  const client_id = uuid();

  clients[client_id] = ws;
  logger.info(`Client '${client_id}' connected`);
  refreshRates(ws);
  ws.send(JSON.stringify({ action: 'save', data: { connection_id: client_id } }));
  ws.on('message', (message) => {
    handleMessage(JSON.parse(message));
  });
  ws.on('close', () => {
    logger.info(`Client '${client_id}' disconnected`);
    Reflect.deleteProperty(clients, client_id);
  })
});

setInterval(() => {
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) refreshRates(client);
  });
},30000);