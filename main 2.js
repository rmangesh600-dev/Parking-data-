async function postJSON(url, data){
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
  return r.json();
}
const fmt = d => d ? new Date(d).toLocaleString() : '-';

// Check-In
const checkinForm = document.getElementById('checkinForm');
if (checkinForm){
  checkinForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const vehicleNo = document.getElementById('vehicleNo').value.trim();
    const owner = document.getElementById('owner').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const type = document.getElementById('type').value;
    const notes = document.getElementById('notes').value.trim();
    const res = await postJSON('/api/checkin', { vehicleNo, owner, phone, type, notes });
    document.getElementById('checkinMsg').textContent = res.ok ? `Checked in: Ticket ${res.record.ticket}` : (res.error || 'Error');
    loadRecords();
    checkinForm.reset();
  });
}

// Check-Out
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm){
  checkoutForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const vehicleNo = document.getElementById('vehicleNoOut').value.trim();
    const res = await postJSON('/api/checkout', { vehicleNo });
    document.getElementById('checkoutMsg').textContent = res.ok ? `Checked out: Duration ${res.receipt.duration}` : (res.error || 'Error');
    loadRecords();
    checkoutForm.reset();
  });
}

async function loadRecords(){
  const r = await fetch('/api/records'); const data = await r.json();
  const tbody = document.querySelector('#tbl tbody');
  if (!tbody) return;
  tbody.innerHTML = (data.rows||[]).map(rec=>`
    <tr>
      <td>${rec.ticket}</td>
      <td>${rec.vehicle_no}</td>
      <td>${rec.owner}</td>
      <td>${rec.phone || '-'}</td>
      <td>${rec.type || '-'}</td>
      <td>${fmt(rec.checkin_iso)}</td>
      <td>${fmt(rec.checkout_iso)}</td>
      <td>${rec.duration_ms!=null ? Math.round(rec.duration_ms/60000)+' min' : '-'}</td>
      <td>${rec.status}</td>
    </tr>
  `).join('');
}
loadRecords();
