const btn_manual_refresh = document.getElementById('btnManualRefresh');
const storage = {};

let ws = {};

const refreshRates = (rates) => {
  console.log('[ refreshRates ]');

  const table_body = document.getElementById('rateTableBody');
  table_body.innerHTML = '';

  let table_row;
  rates.forEach((rate) => {
    table_row = document.createElement('div');
    table_row.className = 'rateTableRow';

    const name_cell = document.createElement('div');
    name_cell.className = 'rateTableCell';
    name_cell.innerHTML = rate.name;
    table_row.appendChild(name_cell);

    const price_cell = document.createElement('div');
    price_cell.className = 'rateTableCell';
    price_cell.innerHTML = `$${rate.priceUsd.toLocaleString('en-UK')}`;
    table_row.appendChild(price_cell);

    table_body.appendChild(table_row);
  });
};

const saveData = (data) => {
  Object.assign(storage, data);
};

const handleMessage = (message) => {
  if (Array.isArray(message)) message.forEach((item) => handleMessage(item));

  switch (message.action) {
    case 'refresh':
      refreshRates(message.data);
      break;
    case 'save':
      saveData(message.data);
      break;
    default:
      console.log('[ ERROR ] - unknown action');
      console.dir(message);
  }
};

const connect = (timer = null) => {
  if (timer) clearTimeout(timer);

  ws = new WebSocket('ws://localhost:5000');

  ws.onmessage = (message) => handleMessage(JSON.parse(message.data));

  ws.onclose = () => {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.');
    const timer = setTimeout(() => {
      connect(timer);
    }, 1000);
  };

  ws.onerror = (err) => {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    ws.close();
  };
};

connect();

btn_manual_refresh.onclick = () => (ws.send(JSON.stringify({ action: 'refresh', connection_id: storage.connection_id })));