var S = {
  dark: false, sessionActive: false, sessionSeconds: 0, sessionRate: 2.0,
  sessionApp: 'ParkMobile', sessionZone: 'Zone B - City Centre',
  budgetAlertShown: false, speed: 0, threshold: 20, delay: 5,
  driveMode: 'auto', stopMode: 'auto',
  countdown: false, countdownVal: 0, countdownTimer: null,
  locationIdx: 0, savings: 4.30,
  budgetEnabled: false, budgetAmount: 5.0,
  permLocation: true, permMotion: true, permNotif: true,
  autoStartEnabled: true,
  dwellTime: 4,
  dwellCounter: 0, dwellTimer: null, dwellTriggered: false,
  dwellNotifStage: 0, dwellNotifTimer: null, dwellBlockedThisStop: false,
  autoStopEnabled: true, manualStartAllowed: true, manualStopAllowed: true,
  connectedApps: { RingGo: false, ParkMobile: true, EasyPark: false, JustPark: false },
  customApps: {},
  exemptions: [
    { label: 'Home', postcode: '', active: false },
    { label: 'Work', postcode: '', active: false }
  ],
  exemptPlaces: { home: false, work: false },
  obHomePC: '', obWorkPC: '',
  history: [
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Today, 08:42', cost:1.80, duration:'54m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'this', day:'Mon' },
    { app:'EasyPark', zone:'Zone C - Beurstraverse', date:'Today, 14:10', cost:3.20, duration:'1h 36m', autoStopped:false, loc:'Beurstraverse 15', week:'this', day:'Mon' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Yesterday, 09:30', cost:0.60, duration:'18m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'this', day:'Sun' },
    { app:'JustPark', zone:'Zone B - Coolsingel', date:'Sat, 11:20', cost:2.40, duration:'1h 12m', autoStopped:true, loc:'Coolsingel 42', week:'this', day:'Sat' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Fri, 08:55', cost:1.60, duration:'48m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'this', day:'Fri' },
    { app:'EasyPark', zone:'Zone D - Weena', date:'Thu, 13:45', cost:4.10, duration:'2h 03m', autoStopped:false, loc:'Weena 70', week:'this', day:'Thu' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Wed, 09:10', cost:1.80, duration:'54m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'this', day:'Wed' },
    { app:'ParkMobile', zone:'Zone B - Coolsingel', date:'Last Mon, 08:50', cost:1.60, duration:'48m 00s', autoStopped:true, loc:'Coolsingel 42', week:'last', day:'Mon' },
    { app:'EasyPark', zone:'Zone C - Beurstraverse', date:'Last Mon, 15:00', cost:2.80, duration:'1h 24m', autoStopped:false, loc:'Beurstraverse 15', week:'last', day:'Mon' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Last Sun, 10:20', cost:0.80, duration:'24m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'last', day:'Sun' },
    { app:'JustPark', zone:'Zone D - Weena', date:'Last Sat, 12:00', cost:3.50, duration:'1h 45m', autoStopped:true, loc:'Weena 70', week:'last', day:'Sat' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Last Fri, 08:40', cost:1.60, duration:'48m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'last', day:'Fri' },
    { app:'EasyPark', zone:'Zone B - Coolsingel', date:'Last Thu, 14:30', cost:2.10, duration:'1h 03m', autoStopped:false, loc:'Coolsingel 42', week:'last', day:'Thu' },
    { app:'ParkMobile', zone:'Zone A - Lijnbaan', date:'Last Wed, 09:00', cost:1.80, duration:'54m 00s', autoStopped:true, loc:'Lijnbaan 10', week:'last', day:'Wed' }
  ],
  tickTimer: null, sheetApp: null, sheetAction: null, lockVisible: false, showDev: false,
  lockStopConfirm: false, lockStopTimer: null,
  historyView: 'insights'
};

var LOCS = [
  { addr:'Lijnbaan 10, Rotterdam', coords:'51.9201N 4.4801E', zone:'Zone B - City Centre', postcode:'3011AA' },
  { addr:'Coolsingel 42, Rotterdam', coords:'51.9226N 4.4791E', zone:'Zone A - Coolsingel', postcode:'3012AA' },
  { addr:'Beurstraverse 15, Rotterdam', coords:'51.9197N 4.4826E', zone:'Zone C - Beurstraverse', postcode:'3011NE' },
  { addr:'Weena 70, Rotterdam', coords:'51.9248N 4.4726E', zone:'Zone D - Central Station', postcode:'3013AP' }
];

function loc() { return LOCS[S.locationIdx]; }
function cost() { return (S.sessionSeconds / 3600) * S.sessionRate; }
function fmtTime(s) { var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h>0?h+'h '+pad(m)+'m '+pad(sc)+'s':pad(m)+'m '+pad(sc)+'s'; }
function fmtFull(s) { return pad(Math.floor(s/3600))+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60); }
function pad(n) { return String(n).padStart(2,'0'); }
function euro(v) { return '\u20ac'+v.toFixed(2); }
function allApps() {
  var r = {};
  Object.keys(S.connectedApps).forEach(function(k){ r[k]=S.connectedApps[k]; });
  Object.keys(S.customApps).forEach(function(k){ r[k]=S.customApps[k]; });
  return r;
}

function toggleDark() {
  S.dark = !S.dark;
  document.getElementById('app').classList.toggle('dark', S.dark);
  document.getElementById('dark-btn').textContent = S.dark ? '\u2600\uFE0F' : '\uD83C\uDF19';
  renderHome(); renderSettings();
}

function toggleDev() {
  S.showDev = !S.showDev;
  var btn = document.getElementById('dev-btn');
  if (btn) {
    btn.style.background = S.showDev ? 'rgba(247,209,23,0.15)' : '';
    btn.style.borderColor = S.showDev ? 'rgba(247,209,23,0.5)' : '';
    btn.style.color = S.showDev ? 'var(--yellow)' : '';
  }
  // Only re-render the dev slot — never the whole screen
  renderDevTools();
}

function showTab(t) {
  ['home','apps','history','settings'].forEach(function(x) {
    document.getElementById('sc-'+x).style.display = x===t ? 'block' : 'none';
    document.getElementById('tab-'+x).classList.toggle('active', x===t);
  });
  if (t==='home') renderHome();
  if (t==='apps') renderApps();
  if (t==='history') renderHistory();
  if (t==='settings') renderSettings();
}

function startTick() {
  if (S.tickTimer) clearInterval(S.tickTimer);
  S.tickTimer = setInterval(function() {
    if (S.sessionActive) {
      S.sessionSeconds++;
      updateDisplay();
      updateDevState();
      if (S.budgetEnabled && !S.budgetAlertShown && cost() >= S.budgetAmount) {
        S.budgetAlertShown = true;
        showBanner('budget', '\uD83D\uDCB0 Budget limit reached \u2014 session continues', 'b-budget');
      }
    } else {
      tickDwell();
    }
  }, 1000);
}

function updateDevState() {
  var statusEl = document.getElementById('dev-status');
  var dwellEl  = document.getElementById('dev-dwell');
  var modeEl   = document.getElementById('dev-mode');
  var thrEl    = document.getElementById('dev-thr');
  var spdEl    = document.getElementById('spd-disp');
  // NOTE: slider value updated via .value property — does NOT fire oninput
  var slider   = document.getElementById('speed-slider');
  if (statusEl) statusEl.innerHTML = S.sessionActive ? '&#x1F7E2; Active' : '&#x26AA; Idle';
  if (dwellEl)  dwellEl.textContent  = Math.floor(S.dwellCounter/60) + 'm ' + (S.dwellCounter%60) + 's';
  if (modeEl)   modeEl.textContent   = S.driveMode;
  if (thrEl)    thrEl.textContent    = S.threshold + ' km/h';
  if (spdEl)    spdEl.textContent    = S.speed;
  // Safe: setting .value on a range input programmatically does NOT fire oninput
  if (slider)   slider.value         = S.speed;
}

function updateDisplay() {
  var t=document.getElementById('live-timer'), c=document.getElementById('live-cost');
  if (t) t.textContent = fmtFull(S.sessionSeconds);
  if (c) c.textContent = euro(cost());
  var lt=document.getElementById('lk-timer'), lc=document.getElementById('lk-cost');
  if (lt) lt.textContent = fmtFull(S.sessionSeconds);
  if (lc) lc.textContent = euro(cost());
  if (S.budgetEnabled) { var pb=document.getElementById('budget-bar'); if(pb) pb.style.width=Math.min(100,(cost()/S.budgetAmount)*100)+'%'; }
}

function showBanner(id, msg, cls) {
  var area = document.getElementById('banner-area');
  if (!area || document.getElementById('b-'+id)) return;
  var el = document.createElement('div');
  el.className = 'banner ' + cls;
  el.id = 'b-' + id;
  // Dwell notification banners use cancelDwellNotif on X tap
  var isDwellNotif = (id === 'dwell');
  var dismissFn = isDwellNotif ? 'cancelDwellNotif()' : 'dismissBanner(\'' + id + '\')';
  el.innerHTML = '<span>' + msg + '</span><span class="bx" onclick="' + dismissFn + '">&#x2715;</span>';
  area.prepend(el);
  // Dwell notification banners don't auto-remove — user must act
  if (!isDwellNotif) {
    setTimeout(function() { var e=document.getElementById('b-'+id); if(e)e.remove(); }, 8000);
  }
}
function dismissBanner(id) {
  var el = document.getElementById('b-'+id);
  if (el) el.remove();
  // Note: countdown cancellation is handled by cancelCountdown() directly.
  // Do NOT call cancelCountdown here — it would create infinite mutual recursion.
}

function isExempt(l) { return S.exemptions.some(function(e){ return e.active && l.postcode===e.postcode; }); }

function startSession() {
  if (S.sessionActive) return;
  var l = loc();
  if (isExempt(l)) { showBanner('exempt', '\uD83C\uDFE0 Exemption zone \u2014 session blocked', 'b-exempt'); return; }
  S.sessionActive = true; S.sessionSeconds = 0; S.budgetAlertShown = false;
  S.sessionZone = l.zone;
  var apps = Object.entries(allApps()).filter(function(e){ return e[1]; });
  S.sessionApp = apps.length ? apps[0][0] : 'ParkMobile';
  showBanner('started', '\u2713 Session started \u2014 ' + S.sessionApp, 'b-start');
  renderSessionCard();
}

function stopSession(auto) {
  if (!S.sessionActive) return;
  dismissBanner('cd');
  cancelCountdown();
  var finalCost = cost();
  var finalDuration = fmtTime(S.sessionSeconds);
  var finalApp = S.sessionApp;
  var finalZone = S.sessionZone;
  var finalLoc = loc().addr.split(',')[0];
  S.history.unshift({ app:finalApp, zone:finalZone, date:'Just now', cost:finalCost, duration:finalDuration, autoStopped:!!auto, loc:finalLoc });
  S.savings += parseFloat((Math.random()*0.4+0.1).toFixed(2));
  S.sessionActive = false;
  S.sessionSeconds = 0;
  S.locationIdx = (S.locationIdx+1) % LOCS.length;
  resetDwell();
  showBanner('stopped', '\u2713 Stopped \u2014 '+finalDuration+' \u00b7 '+euro(finalCost), 'b-info');
  if (S.lockVisible) hideLock();
  renderSessionCard();
}







function setSpeed(v) {
  S.speed = v;
  // Update speed display in dev panel without re-rendering
  var el = document.getElementById('spd-disp'); if (el) el.textContent = v;
  updateZones();
  if (!S.sessionActive) {
    if (v < 8) {
      var dp = document.getElementById('dwell-progress');
      if (dp) dp.style.width = getDwellProgress() + '%';
    } else {
      // Only reset counter — do NOT call renderHome
      S.dwellCounter = 0;
      S.dwellTriggered = false;
      dismissBanner('dwell');
      var dp2 = document.getElementById('dwell-progress');
      if (dp2) dp2.style.width = '0%';
    }
    // Update detector status text without full re-render
    updateDwellStatus();
  }
}

function updateDwellStatus() {
  var statusEl = document.getElementById('dwell-status');
  if (!statusEl) return;
  var v = S.speed;
  if (v >= 8) {
    statusEl.textContent = '\uD83D\uDE97 Speed above 8 km/h \u2014 dwell timer paused';
  } else if (S.dwellCounter > 0) {
    var dwRem = Math.max(0, S.dwellTime * 60 - S.dwellCounter);
    var txt = dwRem >= 60 ? Math.ceil(dwRem/60) + 'm left' : dwRem + 's left';
    statusEl.textContent = '\uD83D\uDDD3 Stationary ' + Math.floor(S.dwellCounter/60) + 'm ' + (S.dwellCounter%60) + 's \u2014 ' + txt;
  } else {
    statusEl.textContent = 'Starts when speed is under 8 km/h for ' + S.dwellTime + ' min';
  }
}




function runQuickTest() {
  console.log('[ParkGuard Test] Starting quick test...');
  // Reset state
  S.sessionActive = false; S.sessionSeconds = 0;
  S.dwellCounter = 0; S.dwellTriggered = false;
  cancelCountdown();
  // Set dwell to 1 min so test completes faster
  var origDwell = S.dwellTime;
  S.dwellTime = 1;
  renderHome();
  showBanner('test', '&#x1F6E0; Quick test running... speed=0, waiting 5s to simulate dwell...', 'b-info');
  var testStep = 0;
  var testTimer = setInterval(function() {
    testStep++;
    if (testStep === 1) {
      // Simulate being parked (speed 0) - manually tick dwell fast
      S.speed = 0;
      for (var i = 0; i < 60; i++) {
        S.dwellCounter++;
        if (S.dwellCounter >= S.dwellTime * 60 && !S.dwellTriggered) {
          S.dwellTriggered = true;
          startSession();
          break;
        }
      }
      var el = document.getElementById('spd-disp'); if (el) el.textContent = 0;
      updateZones();
      renderHome();
      dismissBanner('test');
      showBanner('test', '&#x1F7E2; Session auto-started! Now simulating driving in 3s...', 'b-start');
    } else if (testStep === 2) {
      // Simulate driving - set speed above threshold
      setSpeed(S.threshold + 5);
      var slider = document.querySelector('#sc-home input[type=range]');
      if (slider) slider.value = S.threshold + 5;
      dismissBanner('test');
      showBanner('test', '&#x1F697; Speed set to ' + (S.threshold+5) + ' km/h — countdown started...', 'b-countdown');
    } else if (testStep >= 3) {
      clearInterval(testTimer);
      S.dwellTime = origDwell;
      dismissBanner('test');
    }
  }, 3000);
}

function updateZones() {
  var s=S.speed, t=S.threshold;
  ['zpp','zps','zpd'].forEach(function(id){ var e=document.getElementById(id); if(e)e.classList.remove('az'); });
  var a = s<=4?'zpp':s<t?'zps':'zpd';
  var e = document.getElementById(a); if(e) e.classList.add('az');
}

function showLock() {
  S.lockVisible=true;
  document.getElementById('lock-screen').classList.remove('hidden');
  updateLockClock();
  document.getElementById('lk-zone').textContent = S.sessionActive ? S.sessionZone.split(' - ')[0] : 'None';
  if (!S.sessionActive) { document.getElementById('lk-timer').textContent='--:--:--'; document.getElementById('lk-cost').textContent='\u20ac0.00'; }
}
function hideLock() {
  S.lockVisible = false;
  lockStopCancel();
  document.getElementById('lock-screen').classList.add('hidden');
}

function lockStopTap() {
  if (!S.lockStopConfirm) {
    // First tap — enter confirmation state with 3s auto-cancel
    S.lockStopConfirm = true;
    renderLockButtons();
    S.lockStopTimer = setTimeout(function() {
      lockStopCancel();
    }, 3000);
  } else {
    // Second tap — confirmed, stop the session
    lockStopCancel();
    stopSession(false);
    hideLock();
  }
}

function lockStopCancel() {
  if (S.lockStopTimer) { clearTimeout(S.lockStopTimer); S.lockStopTimer = null; }
  S.lockStopConfirm = false;
  renderLockButtons();
}

function renderLockButtons() {
  var area = document.getElementById('lk-btn-area');
  if (!area) return;
  if (S.lockStopConfirm) {
    area.innerHTML =
      '<div style="width:100%;">' +
        '<div style="font-size:11px;color:rgba(255,180,180,0.9);text-align:center;margin-bottom:8px;font-weight:600;">' +
          '&#x26A0;&#xFE0F; Tap again to confirm stop' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="lockStopTap()" style="flex:1;padding:9px;border-radius:10px;border:2px solid rgba(255,100,100,0.9);background:rgba(200,40,40,0.85);color:white;font-size:13px;font-weight:700;font-family:var(--font);cursor:pointer;">&#x1F6D1; Confirm Stop</button>' +
          '<button onclick="lockStopCancel()" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.2);background:transparent;color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;">Cancel</button>' +
        '</div>' +
      '</div>';
  } else {
    area.innerHTML =
      '<button class="btn btn-danger btn-sm" style="flex:1;width:auto;" onclick="lockStopTap()">Stop Session</button>' +
      '<button class="btn btn-ghost btn-sm" style="flex:1;width:auto;color:rgba(255,255,255,0.65);border-color:rgba(255,255,255,0.15);" onclick="hideLock()">Dismiss</button>';
  }
}
function updateLockClock() {
  var now=new Date();
  document.getElementById('lk-time').textContent = pad(now.getHours())+':'+pad(now.getMinutes());
  var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('lk-date').textContent = days[now.getDay()]+', '+now.getDate()+' '+months[now.getMonth()];
}

function openMap() {
  var l=loc();
  document.getElementById('map-addr').textContent=l.addr;
  document.getElementById('map-txt-coords').textContent=l.coords;
  document.getElementById('map-svg-coords').textContent=l.coords;
  document.getElementById('map-modal').classList.remove('hidden');
}
function closeMap() { document.getElementById('map-modal').classList.add('hidden'); }
function changeLocation() { if(S.sessionActive)return; S.locationIdx=(S.locationIdx+1)%LOCS.length; renderHome(); }

function openSheet(app, action) {
  S.sheetApp=app; S.sheetAction=action;
  document.getElementById('sh-title').textContent=(action==='connect'?'Connect ':'Disconnect ')+app;
  document.getElementById('sh-body').textContent=action==='connect'?'Link '+app+' to ParkGuard for session monitoring.':'Remove '+app+' from ParkGuard?';
  document.getElementById('sh-confirm').textContent=action==='connect'?'Connect':'Disconnect';
  document.getElementById('sh-confirm').className='btn '+(action==='connect'?'btn-primary':'btn-danger');
  document.getElementById('connect-modal').classList.remove('hidden');
}
function closeSheet() { document.getElementById('connect-modal').classList.add('hidden'); }
function confirmSheet() {
  if (S.connectedApps.hasOwnProperty(S.sheetApp)) { S.connectedApps[S.sheetApp]=S.sheetAction==='connect'; }
  else { S.customApps[S.sheetApp]=S.sheetAction==='connect'; }
  closeSheet(); renderApps();
}

function addCustomApp() {
  var name = document.getElementById('custom-app-input').value.trim();
  if (!name) return;
  S.customApps[name] = false;
  document.getElementById('custom-app-input').value = '';
  document.getElementById('custom-app-modal').classList.add('hidden');
  renderApps();
}

function addExemption(pc, label) {
  if (!pc.trim()) return;
  S.exemptions.push({ label:label.trim()||pc.toUpperCase().trim(), postcode:pc.toUpperCase().trim(), active:false });
  renderSettings();
}
function toggleExemption(i) { S.exemptions[i].active=!S.exemptions[i].active; renderHome(); renderSettings(); }
function removeExemption(i) { S.exemptions.splice(i,1); renderSettings(); }

/* ====== RENDER HOME ====== */

function renderSessionCard() {
  // Update only the session card area — never rebuilds the slider
  var l = loc();
  var ex = isExempt(l);
  var h = '';

  if (S.sessionActive) {
    var bgt = '';
    if (S.budgetEnabled) {
      var pct = Math.min(100, (cost()/S.budgetAmount)*100);
      bgt += '<div style="margin-top:10px;"><div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:4px;"><span>Budget</span><span>'+euro(cost())+' / '+euro(S.budgetAmount)+'</span></div>';
      bgt += '<div class="prog-wrap"><div class="prog-bar" id="budget-bar" style="width:'+pct+'%"></div></div></div>';
    }
    h += '<div class="card card-navy" style="padding:20px 18px;border-radius:20px;">';
    // Top: ACTIVE SESSION + LIVE badge
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    h += '<div style="font-size:10px;font-weight:700;letter-spacing:1.2px;color:rgba(255,255,255,0.45);text-transform:uppercase;">Active Session</div>';
    h += '<span class="badge badge-live" style="font-size:10px;padding:3px 10px;">&#9679;&nbsp;LIVE</span>';
    h += '</div>';
    // App name + zone (Jurgen style — big name)
    h += '<div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.3px;margin-bottom:2px;">'+S.sessionApp+'</div>';
    h += '<div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:16px;">'+S.sessionZone+'</div>';
    // Two metric tiles
    h += '<div style="display:flex;gap:10px;margin-bottom:14px;">';
    h += '<div style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:12px 14px;">';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    h += '<span style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;letter-spacing:0.4px;">Duration</span></div>';
    h += '<div class="timer-big" id="live-timer" style="font-size:22px;letter-spacing:0.3px;font-weight:700;">'+fmtFull(S.sessionSeconds)+'</div>';
    h += '</div>';
    h += '<div style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:12px 14px;">';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
    h += '<span style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;letter-spacing:0.4px;">Cost</span></div>';
    h += '<div class="cost-big" id="live-cost" style="font-size:22px;font-weight:700;">'+euro(cost())+'</div>';
    h += '</div>';
    h += '</div>';
    h += bgt;
    // Parked at tile
    h += '<div style="background:rgba(255,255,255,0.1);border-radius:14px;padding:12px 14px;margin-bottom:14px;">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
    h += '<div style="display:flex;align-items:center;gap:5px;">';
    h += '<svg width="10" height="10" viewBox="0 0 24 24" fill="#ff7096"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
    h += '<span style="font-size:10px;color:rgba(255,255,255,0.45);font-weight:600;">Parked at</span></div>';
    h += '<button onclick="changeLocation()" style="padding:3px 10px;font-size:11px;font-weight:600;font-family:var(--font);background:rgba(247,209,23,0.15);border:1px solid rgba(247,209,23,0.35);color:var(--yellow);border-radius:8px;cursor:pointer;">Change</button>';
    h += '</div>';
    h += '<div style="font-size:14px;font-weight:700;color:white;margin-bottom:2px;">'+l.addr+'</div>';
    h += '<div style="font-size:10px;color:rgba(255,255,255,0.38);font-family:var(--mono);">'+l.coords+'</div>';
    h += '</div>';
    // Action buttons — matching reference
    h += '<div style="display:flex;gap:10px;">';
    h += '<button onclick="openMap()" style="flex:1;padding:12px;border-radius:12px;border:none;background:var(--navy2);color:white;font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">';
    h += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Find My Car</button>';
    if (S.manualStopAllowed) {
      h += '<button onclick="stopSession(false)" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid rgba(255,100,100,0.65);background:transparent;color:rgb(255,120,120);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">';
      h += '<svg width="11" height="11" viewBox="0 0 24 24" fill="rgb(255,120,120)"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>Stop Session</button>';
    }
    h += '</div>';
    h += '</div>';
  } else {
    h += '<div class="card" style="text-align:center;padding:24px 18px;">';
    h += '<div style="font-size:40px;margin-bottom:10px;">&#x1F17F;&#xFE0F;</div>';
    h += '<div style="font-weight:700;font-size:16px;margin-bottom:4px;">No Active Session</div>';
    h += '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">'+l.addr+'</div>';
    if (ex) {
      h += '<div style="background:rgba(13,61,26,0.15);color:#2d9e5a;border:1px solid rgba(45,158,90,0.3);border-radius:10px;padding:8px 12px;font-size:12px;margin-bottom:12px;font-weight:500;">&#x1F3E0; Exemption zone active</div>';
    }
    if (S.manualStartAllowed) {
      h += '<button class="btn btn-primary" onclick="startSession()"'+(ex?' disabled':'')+'>Start Session Manually</button>';
    }
    if (S.autoStartEnabled) {
      var dwPct = getDwellProgress();
      var dwRem = Math.max(0, S.dwellTime * 60 - S.dwellCounter);
      var dwRemTxt = dwRem >= 60 ? Math.ceil(dwRem/60) + 'm left' : dwRem + 's left';
      var dwActive = S.speed < 8 && S.dwellCounter > 0;
      h += '<div style="margin-top:12px;background:rgba(0,45,114,0.06);border:1px solid var(--border);border-radius:12px;padding:12px 14px;">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">';
      h += '<div style="font-size:12px;font-weight:600;color:var(--text);">&#x1F4F1; Auto-start detector</div>';
      h += '<div style="font-size:11px;color:var(--muted);">'+(dwActive?'<span style="color:#2d9e5a;font-weight:600;">'+dwRemTxt+'</span>':'Waiting...')+'</div>';
      h += '</div>';
      h += '<div style="background:var(--border);border-radius:6px;height:4px;margin-bottom:8px;">';
      h += '<div id="dwell-progress" style="height:4px;border-radius:6px;background:var(--navy);transition:width 1s;width:'+dwPct+'%;"></div></div>';
      var dwStatusTxt = S.speed >= 8
        ? '\uD83D\uDE97 Speed above 8 km/h \u2014 dwell timer paused'
        : (dwActive
            ? '\uD83D\uDDD3 Stationary '+Math.floor(S.dwellCounter/60)+'m '+(S.dwellCounter%60)+'s'
            : 'Starts when speed is under 8 km/h for '+S.dwellTime+' min');
      h += '<div id="dwell-status" style="font-size:11px;color:var(--muted);line-height:1.5;">'+dwStatusTxt+'</div></div>';
    }
    h += '</div>';
  }

  // Inject into the dedicated session-card slot
  var slot = document.getElementById('session-card-slot');
  if (slot) {
    slot.innerHTML = h;
  }

  // Update dev state tiles without touching the slider
  updateDevState();
}

function renderHome() {
  var el = document.getElementById('sc-home');
  var l = loc();
  var ex = isExempt(l);
  var h = '';

  // Session card slot — filled by renderSessionCard() without touching slider
  h += '<div class="section-label">Active Session</div>';
  h += '<div id="session-card-slot"></div>';

  // Dev tools panel — rendered into its own persistent slot
  h += '<div id="dev-tools-slot"></div>';

  // Savings
  h += '<div class="card" style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;border:1.5px solid rgba(45,158,90,0.2);background:var(--card);">';
  // Left: label + amount
  h += '<div>';
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">';
  h += '<span style="font-size:15px;">&#x1F4B0;</span>';
  h += '<span style="font-size:13px;font-weight:600;color:#2d9e5a;">Saved this month</span>';
  h += '</div>';
  h += '<div style="font-size:32px;font-weight:800;color:#2d9e5a;font-family:var(--mono);line-height:1;">'+euro(S.savings)+'</div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-top:5px;">&#x1F6D1; via auto-stop</div>';
  h += '</div>';
  // Right: bank icon in green circle
  h += '<div style="width:52px;height:52px;border-radius:16px;background:rgba(45,158,90,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
  h += '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2d9e5a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>';
  h += '</div>';
  h += '</div>';

  el.innerHTML = h;

  // Fill the session card slot (safe — no slider inside)
  renderSessionCard();

  // Fill the dev tools slot (slider lives here — only rebuilt when toggled)
  renderDevTools();
}

function renderDevTools() {
  var slot = document.getElementById('dev-tools-slot');
  if (!slot) return;
  if (!S.showDev) {
    // Hidden stubs so updateZones / setSpeed can still find their elements
    slot.innerHTML =
      '<div id="zpp" class="hidden"></div>' +
      '<div id="zps" class="hidden"></div>' +
      '<div id="zpd" class="hidden"></div>' +
      '<div id="spd-disp" class="hidden">'+S.speed+'</div>';
    return;
  }
  var h = '';
  h += '<div style="margin-bottom:12px;border:1.5px dashed rgba(247,209,23,0.35);border-radius:16px;overflow:hidden;">';
  h += '<div style="background:rgba(247,209,23,0.06);padding:10px 14px;display:flex;align-items:center;gap:8px;">';
  h += '<span style="font-size:13px;">&#x1F6E0;</span>';
  h += '<span style="font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:0.6px;text-transform:uppercase;">Developer Tools</span>';
  h += '<span style="font-size:10px;color:var(--muted);margin-left:auto;">v11</span></div>';
  h += '<div style="padding:14px;">';
  h += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);margin-bottom:10px;">Speed Simulator</div>';
  h += '<div style="display:flex;align-items:baseline;gap:4px;margin-bottom:10px;">';
  h += '<span class="speed-big" id="spd-disp">'+S.speed+'</span>';
  h += '<span style="font-size:16px;color:var(--muted);margin-left:2px;">km/h</span></div>';
  h += '<div style="display:flex;margin-bottom:14px;">';
  h += '<span class="zone-pill zone-parked '+(S.speed<=4?'az':'')+'" id="zpp">Parked</span>';
  h += '<span class="zone-pill zone-slow '+(S.speed>4&&S.speed<S.threshold?'az':'')+'" id="zps">Slow</span>';
  h += '<span class="zone-pill zone-driving '+(S.speed>=S.threshold?'az':'')+'" id="zpd">Driving</span></div>';
  // KEY: slider uses oninput only — setting .value in JS does NOT fire oninput
  h += '<div class="rng-wrap"><span style="font-size:11px;color:var(--muted);">0</span>';
  h += '<input id="speed-slider" type="range" min="0" max="80" step="1" value="'+S.speed+'" oninput="setSpeed(parseInt(this.value))">';
  h += '<span style="font-size:11px;color:var(--muted);">80</span></div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center;">Drag to simulate speed</div>';
  h += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">';
  h += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);margin-bottom:8px;">Session State</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
  h += '<div style="background:var(--bg);border-radius:9px;padding:8px 10px;"><div style="font-size:10px;color:var(--muted);">Status</div>';
  h += '<div id="dev-status" style="font-size:12px;font-weight:600;">'+(S.sessionActive?'&#x1F7E2; Active':'&#x26AA; Idle')+'</div></div>';
  h += '<div style="background:var(--bg);border-radius:9px;padding:8px 10px;"><div style="font-size:10px;color:var(--muted);">Dwell</div>';
  h += '<div id="dev-dwell" style="font-size:12px;font-weight:600;font-family:var(--mono);">'+Math.floor(S.dwellCounter/60)+'m '+(S.dwellCounter%60)+'s</div></div>';
  h += '<div style="background:var(--bg);border-radius:9px;padding:8px 10px;"><div style="font-size:10px;color:var(--muted);">Drive mode</div>';
  h += '<div id="dev-mode" style="font-size:12px;font-weight:600;">'+S.driveMode+'</div></div>';
  h += '<div style="background:var(--bg);border-radius:9px;padding:8px 10px;"><div style="font-size:10px;color:var(--muted);">Threshold</div>';
  h += '<div id="dev-thr" style="font-size:12px;font-weight:600;font-family:var(--mono);">'+S.threshold+' km/h</div></div>';
  h += '</div></div>';
  h += '<div style="margin-top:10px;display:flex;gap:8px;">';
  h += '<button class="btn btn-primary btn-sm" style="flex:1;width:auto;background:#F7D117;color:#002D72;font-weight:700;" onclick="runQuickTest()">&#x25B6; Run Quick Test</button>';
  h += '<button class="btn btn-ghost btn-sm" style="flex:1;width:auto;" onclick="resetDevState()">&#x21BA; Reset</button>';
  h += '</div>';
  h += '</div></div>';
  slot.innerHTML = h;
}

function resetDevState() {
  S.sessionActive = false; S.sessionSeconds = 0;
  S.dwellCounter = 0; S.dwellTriggered = false;
  cancelCountdown();
  // Update slider position safely via property (never fires oninput)
  var slider = document.getElementById('speed-slider');
  if (slider) slider.value = 0;
  S.speed = 0;
  updateZones();
  renderSessionCard();
  updateDevState();
}



/* ====== RENDER APPS ====== */
function renderApps() {
  var el = document.getElementById('sc-apps');
  var apps = allApps();
  var h = '<div class="section-label">Parking Apps</div>';
  Object.entries(apps).forEach(function(entry) {
    var app=entry[0], conn=entry[1];
    h += '<div class="card" style="display:flex;align-items:center;gap:12px;">';
    h += '<div class="app-logo" style="background:'+(conn?'var(--navy)':'var(--bg)')+';border:1px solid var(--border);color:'+(conn?'var(--yellow)':'var(--muted)')+';">'+app[0].toUpperCase()+'</div>';
    h += '<div style="flex:1;"><div style="font-weight:600;font-size:14px;">'+app+'</div>';
    h += '<div style="font-size:12px;color:var(--muted);">'+(conn?'Connected':'Not connected')+'</div></div>';
    h += '<button class="btn '+(conn?'btn-ghost':'btn-primary')+' btn-sm" onclick="openSheet(\''+app+'\',\''+(conn?'disconnect':'connect')+'\')">'+( conn?'Disconnect':'Connect')+'</button></div>';
  });
  el.innerHTML = h;
}

/* ====== RENDER HISTORY ====== */
function setHV(n) {
  S.historyView = n === 0 ? 'insights' : 'sessions';
  renderHistory();
}

function renderHistory() {
  var el = document.getElementById('sc-history');
  var h = '';

  // ── Tab switcher ──────────────────────────────────────────────────────────
  h += '<div style="display:flex;background:var(--border);border-radius:11px;padding:3px;margin-bottom:16px;gap:2px;">';
  h += '<div class="hi-tab '+(S.historyView==='insights'?'act':'')+'" onclick="setHV(0)">Insights</div>';
  h += '<div class="hi-tab '+(S.historyView==='sessions'?'act':'')+'" onclick="setHV(1)">Sessions</div>';
  h += '</div>';

  if (S.historyView === 'insights') {
    h += renderInsights();
  } else {
    h += renderSessions();
  }

  el.innerHTML = h;
}

function renderInsights() {
  var h = '';
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // ── Compute data ──────────────────────────────────────────────────────────
  var thisWeek = S.history.filter(function(s){ return s.week === 'this'; });
  var lastWeek = S.history.filter(function(s){ return s.week === 'last'; });

  // Per-day spend this week
  var dayTotals = {};
  days.forEach(function(d){ dayTotals[d] = 0; });
  thisWeek.forEach(function(s){ if(dayTotals[s.day]!==undefined) dayTotals[s.day] += s.cost; });

  // Per-day spend last week (for comparison)
  var lastDayTotals = {};
  days.forEach(function(d){ lastDayTotals[d] = 0; });
  lastWeek.forEach(function(s){ if(lastDayTotals[s.day]!==undefined) lastDayTotals[s.day] += s.cost; });

  var thisTotal = thisWeek.reduce(function(a,s){ return a+s.cost; }, 0);
  var lastTotal = lastWeek.reduce(function(a,s){ return a+s.cost; }, 0);
  var saved = S.savings;
  var lastSaved = parseFloat((saved * 0.72).toFixed(2));
  var diff = thisTotal - lastTotal;
  var diffPct = lastTotal > 0 ? Math.round(Math.abs(diff/lastTotal)*100) : 0;
  var maxDay = Math.max.apply(null, days.map(function(d){ return Math.max(dayTotals[d], lastDayTotals[d]); }));
  if (maxDay === 0) maxDay = 1;

  // Zone frequency
  var zoneCounts = {};
  S.history.forEach(function(s){
    var z = s.zone.split(' - ')[0];
    zoneCounts[z] = (zoneCounts[z]||0) + 1;
  });
  var sortedZones = Object.keys(zoneCounts).sort(function(a,b){ return zoneCounts[b]-zoneCounts[a]; });
  var maxZone = zoneCounts[sortedZones[0]] || 1;

  // Sessions auto-stopped
  var autoCount = S.history.filter(function(s){ return s.autoStopped; }).length;
  var autoRate = S.history.length > 0 ? Math.round(autoCount/S.history.length*100) : 0;

  // ── Weekly spend chart ────────────────────────────────────────────────────
  h += '<div class="section-label">Weekly Spend</div>';
  h += '<div class="card">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
  h += '<div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-bottom:2px;">This week</div>';
  h += '<div style="font-size:24px;font-weight:800;font-family:var(--mono);color:var(--text);">'+euro(thisTotal)+'</div>';
  h += '</div>';
  h += '<div style="text-align:right;">';
  h += '<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">vs last week</div>';
  var arrow = diff > 0 ? '▲' : '▼';
  var diffColor = diff > 0 ? '#d63031' : '#2d9e5a';
  if (diff === 0) { arrow = '▶'; diffColor = 'var(--muted)'; }
  h += '<div style="font-size:13px;font-weight:700;color:'+diffColor+';">'+arrow+' '+diffPct+'%</div>';
  h += '<div style="font-size:11px;color:var(--muted);">'+euro(lastTotal)+' last week</div>';
  h += '</div></div>';

  // Chart
  h += '<div class="bar-wrap">';
  days.forEach(function(d) {
    var thisH = maxDay > 0 ? Math.round((dayTotals[d]/maxDay)*68) : 0;
    var lastH = maxDay > 0 ? Math.round((lastDayTotals[d]/maxDay)*68) : 0;
    h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">';
    // Stacked: last week (faint) behind this week
    h += '<div style="width:100%;display:flex;align-items:flex-end;gap:2px;height:72px;">';
    h += '<div style="flex:1;background:var(--border);border-radius:5px 5px 0 0;height:'+(lastH||3)+'px;min-height:3px;" title="Last: '+euro(lastDayTotals[d])+'"></div>';
    h += '<div class="bar '+(dayTotals[d]>0?'hi':'lo')+'" style="flex:1;height:'+(thisH||3)+'px;" title="This: '+euro(dayTotals[d])+'"></div>';
    h += '</div>';
    h += '</div>';
  });
  h += '</div>';
  // Day labels
  h += '<div style="display:flex;margin-top:5px;">';
  days.forEach(function(d) {
    h += '<div style="flex:1;text-align:center;font-size:10px;font-weight:600;color:var(--muted);">'+d+'</div>';
  });
  h += '</div>';
  // Legend
  h += '<div style="display:flex;align-items:center;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">';
  h += '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);"><div style="width:10px;height:5px;border-radius:3px;background:var(--navy);"></div>This week</div>';
  h += '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);"><div style="width:10px;height:5px;border-radius:3px;background:var(--border);"></div>Last week</div>';
  h += '</div>';
  h += '</div>';

  // ── This vs last month savings ─────────────────────────────────────────────
  h += '<div class="section-label">Savings</div>';
  h += '<div class="card">';
  h += '<div style="display:flex;gap:8px;">';
  h += '<div class="ins-stat">';
  h += '<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">This month</div>';
  h += '<div class="ins-big">'+euro(saved)+'</div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-top:3px;">auto-stopped</div>';
  h += '</div>';
  h += '<div class="ins-stat">';
  h += '<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Last month</div>';
  h += '<div class="ins-big" style="color:var(--muted);">'+euro(lastSaved)+'</div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-top:3px;">auto-stopped</div>';
  h += '</div>';
  h += '</div>';
  var savingsDiff = saved - lastSaved;
  var savingsPct = lastSaved > 0 ? Math.round(Math.abs(savingsDiff/lastSaved)*100) : 0;
  var savingsArrow = savingsDiff >= 0 ? '▲' : '▼';
  var savingsColor = savingsDiff >= 0 ? '#2d9e5a' : '#d63031';
  h += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px;">';
  h += '<span style="font-size:13px;font-weight:700;color:'+savingsColor+';">'+savingsArrow+' '+savingsPct+'% more saved</span>';
  h += '<span style="font-size:11px;color:var(--muted);">vs last month</span>';
  h += '</div>';
  h += '</div>';

  // ── Most-used zones ───────────────────────────────────────────────────────
  h += '<div class="section-label">Top Zones</div>';
  h += '<div class="card" style="padding:14px 16px;">';
  sortedZones.slice(0,4).forEach(function(zone, i) {
    var count = zoneCounts[zone];
    var pct = Math.round((count/maxZone)*100);
    var spend = S.history.filter(function(s){ return s.zone.split(' - ')[0]===zone; }).reduce(function(a,s){ return a+s.cost; },0);
    h += '<div class="zone-bar">';
    h += '<div style="width:20px;height:20px;border-radius:5px;background:'+(i===0?'var(--navy)':'var(--border)')+';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:'+(i===0?'var(--yellow)':'var(--muted)')+';flex-shrink:0;">'+(i+1)+'</div>';
    h += '<div style="flex:1;">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text);">'+zone+'</div>';
    h += '<div style="font-size:11px;color:var(--muted);">'+count+' visit'+(count!==1?'s':'')+' &middot; '+euro(spend)+'</div>';
    h += '</div>';
    h += '<div style="background:var(--border);border-radius:5px;height:4px;">';
    h += '<div class="zone-fill" style="width:'+pct+'%;"></div>';
    h += '</div>';
    h += '</div></div>';
  });
  h += '</div>';

  // ── Auto-stop rate ─────────────────────────────────────────────────────────
  h += '<div class="section-label">Efficiency</div>';
  h += '<div class="card">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
  h += '<div><div style="font-size:13px;font-weight:600;color:var(--text);">Auto-stop rate</div>';
  h += '<div style="font-size:11px;color:var(--muted);">Sessions stopped automatically</div></div>';
  h += '<div style="font-size:26px;font-weight:800;font-family:var(--mono);color:var(--navy);" class="dark-accent">'+autoRate+'%</div>';
  h += '</div>';
  h += '<div style="background:var(--border);border-radius:6px;height:6px;">';
  h += '<div style="height:6px;border-radius:6px;background:var(--navy);width:'+autoRate+'%;transition:width 0.6s;"></div>';
  h += '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:5px;">';
  h += '<div style="font-size:10px;color:var(--muted);">'+autoCount+' auto-stopped</div>';
  h += '<div style="font-size:10px;color:var(--muted);">'+(S.history.length-autoCount)+' manual</div>';
  h += '</div>';
  h += '</div>';

  return h;
}

function renderSessions() {
  var h = '';
  if (S.history.length === 0) {
    h += '<div class="card" style="text-align:center;padding:32px 16px;">';
    h += '<div style="font-size:36px;margin-bottom:10px;">&#x1F17F;&#xFE0F;</div>';
    h += '<div style="font-weight:600;color:var(--text);margin-bottom:4px;">No sessions yet</div>';
    h += '<div style="font-size:13px;color:var(--muted);">Start your first session to see history here.</div>';
    h += '</div>';
    return h;
  }
  h += '<div class="card" style="padding:4px 16px;">';
  S.history.forEach(function(s) {
    h += '<div class="hist-item">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    h += '<div><div style="font-weight:600;font-size:14px;color:var(--text);">'+s.app+'</div>';
    h += '<div style="font-size:12px;color:var(--muted);">'+s.zone+'</div></div>';
    h += '<div style="text-align:right;"><div style="font-weight:700;font-family:var(--mono);color:var(--navy);">'+euro(s.cost)+'</div>';
    h += '<div style="font-size:11px;color:var(--muted);">'+s.duration+'</div></div></div>';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px;">';
    h += '<div style="font-size:11px;color:var(--muted);">&#128205; '+s.loc+' &middot; '+s.date+'</div>';
    if (s.autoStopped) h += '<span class="badge badge-auto" style="font-size:10px;">Auto-stopped</span>';
    h += '</div></div>';
  });
  h += '</div>';
  return h;
}


/* ====== RENDER SETTINGS ====== */
function renderSettings() {
  var el = document.getElementById('sc-settings');
  var h = '';

  h += '<div class="section-label">Appearance</div><div class="card">';
  h += '<div class="sw-row"><div><div style="font-weight:500;color:var(--text);">Dark Mode</div><div style="font-size:12px;color:var(--muted);">'+(S.dark?'Dark':'Light')+' theme active</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.dark?'checked':'')+' onchange="toggleDark()"><span class="sw-track"></span></label></div></div>';

  h += '<div class="section-label">Session Control</div><div class="card">';
  h += '<div style="font-size:12px;font-weight:700;margin-bottom:10px;letter-spacing:0.3px;color:var(--text);">\u2705 SESSION START</div>';
  h += '<div class="trigger-card"><div class="tr-row"><div><div style="font-weight:500;font-size:13px;color:var(--text);">Auto-Start</div><div class="tr-sub">Activity mode transition + dwell time fallback</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.autoStartEnabled?'checked':'')+' onchange="S.autoStartEnabled=this.checked;if(!this.checked){resetDwell();}renderSettings();renderHome()"><span class="sw-track"></span></label></div>';

  h += '</div>';
  h += '<div class="trigger-card"><div class="tr-row"><div><div style="font-weight:500;font-size:13px;color:var(--text);">Manual Start</div><div class="tr-sub">Show Start button on Home screen</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.manualStartAllowed?'checked':'')+' onchange="S.manualStartAllowed=this.checked;renderHome();renderSettings()"><span class="sw-track"></span></label></div></div>';

  h += '<div style="font-size:12px;font-weight:700;margin:14px 0 10px;letter-spacing:0.3px;color:var(--text);">\uD83D\uDED1 SESSION STOP</div>';
  h += '<div class="trigger-card"><div class="tr-row"><div><div style="font-weight:500;font-size:13px;color:var(--text);">Auto-Stop (when driving detected)</div><div class="tr-sub">Triggers when speed exceeds threshold</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.autoStopEnabled?'checked':'')+' onchange="S.autoStopEnabled=this.checked;S.driveMode=this.checked?\'auto\':\'notify\';renderSettings()"><span class="sw-track"></span></label></div></div>';
  h += '<div class="trigger-card"><div class="tr-row"><div><div style="font-weight:500;font-size:13px;color:var(--text);">Manual Stop</div><div class="tr-sub">Show Stop button on Home screen</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.manualStopAllowed?'checked':'')+' onchange="S.manualStopAllowed=this.checked;renderHome();renderSettings()"><span class="sw-track"></span></label></div></div></div>';

  h += '<div class="section-label">Driving Response</div><div class="card">';
  h += '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">When driving is detected, ParkGuard should:</div>';
  h += '<div class="radio-opt '+(S.driveMode==='auto'?'sel':'')+'" onclick="S.driveMode=\'auto\';S.autoStopEnabled=true;renderSettings()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Auto-Stop</div><div style="font-size:12px;color:var(--muted);">End session automatically after countdown</div></div></div>';
  h += '<div class="radio-opt '+(S.driveMode==='notify'?'sel':'')+'" onclick="S.driveMode=\'notify\';S.autoStopEnabled=false;renderSettings()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Send Notification</div><div style="font-size:12px;color:var(--muted);">Alert you but keep session running</div></div></div>';

  h += '<div style="height:1px;background:var(--border);margin:12px 0;"></div>';
  h += '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">When you stop driving, ParkGuard should:</div>';
  h += '<div class="radio-opt '+(S.stopMode==='auto'?'sel':'')+'" onclick="S.stopMode=\'auto\';renderSettings()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Auto-Start New Session</div><div style="font-size:12px;color:var(--muted);">Automatically begin a new parking session</div></div></div>';
  h += '<div class="radio-opt '+(S.stopMode==='notify'?'sel':'')+'" onclick="S.stopMode=\'notify\';renderSettings()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Send Notification</div><div style="font-size:12px;color:var(--muted);">Alert you to start a session manually</div></div></div>';
  h += '<div class="radio-opt '+(S.stopMode==='nothing'?'sel':'')+'" onclick="S.stopMode=\'nothing\';renderSettings()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Do Nothing</div><div style="font-size:12px;color:var(--muted);">No action, you manage sessions manually</div></div></div>';
  h += '</div>';

  h += '<div class="section-label">Exemption Zones</div><div class="card">';
  h += '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Active zones block auto-start at that postcode. Tap to toggle.</div>';
  S.exemptions.forEach(function(e,i) {
    h += '<div class="ztag '+(e.active?'zactive':'')+'" onclick="toggleExemption('+i+')">';
    h += '<span>'+(e.active?'&#x1F3E0;':'&#x25CB;')+'</span>';
    h += '<span style="font-weight:600;color:var(--text);">'+e.label+'</span>';
    h += '<span style="font-size:10px;font-family:var(--mono);opacity:0.7;color:var(--text);">'+e.postcode+'</span>';
    h += '<span onclick="event.stopPropagation();removeExemption('+i+')" style="color:var(--muted);margin-left:2px;cursor:pointer;">&times;</span></div>';
  });
  h += '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">';
  h += '<input type="text" id="new-pc" placeholder="Postcode e.g. 3011AA" style="flex:1;min-width:120px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--font);outline:none;">';
  h += '<input type="text" id="new-lbl" placeholder="Label" style="width:80px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--font);outline:none;">';
  h += '<button class="btn btn-primary btn-sm" onclick="addExemption(document.getElementById(\'new-pc\').value,document.getElementById(\'new-lbl\').value);document.getElementById(\'new-pc\').value=\'\';document.getElementById(\'new-lbl\').value=\'\';">+</button></div></div>';

  h += '<div class="section-label">Detection</div><div class="card">';
  h += '<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:500;margin-bottom:2px;color:var(--text);">Dwell Time (auto-start fallback)</div>';
  h += '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Triggers if speed stays below 8 km/h for this long</div>';
  h += '<div class="rng-wrap"><span style="font-size:11px;color:var(--muted);">1m</span>';
  h += '<input type="range" min="1" max="10" step="1" value="'+S.dwellTime+'" oninput="S.dwellTime=parseInt(this.value);document.getElementById(\'dwv\').textContent=this.value+\' min\';resetDwell();renderHome();">';
  h += '<span class="rng-val" id="dwv">'+S.dwellTime+' min</span></div></div>';
  h += '<div style="margin-bottom:14px;"><div style="font-size:13px;font-weight:500;margin-bottom:8px;color:var(--text);">Driving Speed Threshold</div>';
  h += '<div class="rng-wrap"><span style="font-size:11px;color:var(--muted);">10</span>';
  h += '<input type="range" min="10" max="40" step="1" value="'+S.threshold+'" oninput="S.threshold=parseInt(this.value);document.getElementById(\'tv\').textContent=this.value+\' km/h\';">';
  h += '<span class="rng-val" id="tv">'+S.threshold+' km/h</span></div></div>';
  h += '<div><div style="font-size:13px;font-weight:500;margin-bottom:8px;color:var(--text);">Confirmation Delay (stop)</div>';
  h += '<div class="rng-wrap"><span style="font-size:11px;color:var(--muted);">5s</span>';
  h += '<input type="range" min="5" max="30" step="1" value="'+S.delay+'" oninput="S.delay=parseInt(this.value);document.getElementById(\'dv\').textContent=this.value+\'s\';">';
  h += '<span class="rng-val" id="dv">'+S.delay+'s</span></div></div></div>';

  h += '<div class="section-label">Budget</div><div class="card">';
  h += '<div class="sw-row"><div><div style="font-weight:500;color:var(--text);">Budget Limit</div><div style="font-size:12px;color:var(--muted);">Get an alert when cost reaches limit</div></div>';
  h += '<label class="sw"><input type="checkbox" '+(S.budgetEnabled?'checked':'')+' onchange="S.budgetEnabled=this.checked;renderSettings();renderHome()"><span class="sw-track"></span></label></div>';
  if (S.budgetEnabled) {
    h += '<div style="margin-top:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:16px;font-weight:700;">&euro;</span>';
    h += '<input type="number" min="0.5" max="50" step="0.5" value="'+S.budgetAmount+'" onchange="S.budgetAmount=parseFloat(this.value)||5;renderHome();" style="width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;font-size:14px;color:var(--text);font-family:var(--mono);outline:none;"></div>';
  }
  h += '</div>';

  h += '<div class="section-label">Permissions</div><div class="card">';
  [['&#128205; Location','permLocation','Zone detection & exemptions'],['&#128241; Motion','permMotion','Accelerometer for auto-start'],['&#128276; Notifications','permNotif','Driving alerts & budget warnings']].forEach(function(p) {
    h += '<div class="sw-row"><div><div style="font-weight:500;font-size:13px;color:var(--text);">'+p[0]+'</div><div style="font-size:11px;color:var(--muted);">'+p[2]+'</div></div>';
    h += '<label class="sw"><input type="checkbox" '+(S[p[1]]?'checked':'')+' onchange="S[\''+p[1]+'\']=this.checked"><span class="sw-track"></span></label></div>';
  });
  h += '</div>';

  h += '<div style="margin-top:8px;margin-bottom:28px;">';
  h += '<button class="btn btn-ghost" onclick="showOnboarding()">Replay Introduction</button></div>';

  el.innerHTML = h;
}

/* ====== ONBOARDING ====== */
var obStep = 0;

function showOnboarding() {
  obStep = 0;
  document.getElementById('onboarding').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
  renderOB();
}

function renderOB() {
  document.getElementById('ob-dots').innerHTML = [0,1,2,3,4,5].map(function(i) {
    return '<div class="ob-dot '+(i<=obStep?'done':'')+'"></div>';
  }).join('');

  var body = document.getElementById('ob-body');
  var nav = document.getElementById('ob-nav');

  /* ---- STEP 0: INTRO ---- */
  if (obStep === 0) {
    body.innerHTML =
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:20px 24px 0;display:flex;align-items:center;gap:10px;">' +
      '<div style="width:32px;height:32px;background:linear-gradient(135deg,#002D72,#0040a0);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#F7D117;">P</div>' +
      '<span style="font-size:18px;font-weight:800;color:var(--text);">ParkGuard</span></div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px 16px;">' +
      '<svg id="intro-svg" viewBox="0 0 340 340" style="width:100%;max-width:340px" xmlns="http://www.w3.org/2000/svg">' +
      '<style>' +
      // 14-second loop. Phases:
      // 0-20%: car drives in from right
      // 20-38%: car parked, spot glows, pin drops, text lingers
      // 38-58%: "Parking started" notification stays visible
      // 58-72%: car drives away — exits completely off-screen right
      // 72-90%: "Parking stopped" notification stays visible
      // 90-100%: reset
      '@keyframes carMove {' +
      '  0%   { transform: translateX(220px); }' +
      '  18%  { transform: translateX(220px); }' +
      '  34%  { transform: translateX(0px);   }' +
      '  56%  { transform: translateX(0px);   }' +
      '  70%  { transform: translateX(240px); }' +
      '  100% { transform: translateX(240px); }' +
      '}' +
      '#car { animation: carMove 14s ease-in-out infinite; }' +

      '@keyframes hlight { 0%{opacity:.85} 20%{opacity:.85} 35%{opacity:0} 57%{opacity:0} 72%{opacity:.85} 100%{opacity:.85} }' +
      '#headlights { animation: hlight 14s ease-in-out infinite; }' +
      '@keyframes brake { 0%{opacity:0} 26%{opacity:0} 32%{opacity:1} 37%{opacity:0} 60%{opacity:0} 65%{opacity:.9} 73%{opacity:0} 100%{opacity:0} }' +
      '#brakelights { animation: brake 14s ease-in-out infinite; }' +

      '@keyframes spotG { 0%{opacity:.12} 34%{opacity:.12} 40%{opacity:.6} 58%{opacity:.6} 62%{opacity:.12} 100%{opacity:.12} }' +
      '#parking-spot { animation: spotG 14s ease-in-out infinite; }' +
      '@keyframes pIconG { 0%{opacity:.3} 36%{opacity:.3} 42%{opacity:1} 58%{opacity:1} 63%{opacity:.3} 100%{opacity:.3} }' +
      '#p-icon { animation: pIconG 14s ease-in-out infinite; }' +

      '@keyframes pinD { 0%{opacity:0;transform:translateY(-10px)} 36%{opacity:0;transform:translateY(-10px)} 42%{opacity:1;transform:translateY(0)} 60%{opacity:1;transform:translateY(0)} 65%{opacity:0} 100%{opacity:0} }' +
      '#location-pin { animation: pinD 14s ease-in-out infinite; }' +
      '@keyframes pinP { 0%,36%,65%,100%{r:0;opacity:0} 44%{r:0;opacity:.9} 50%{r:14;opacity:0} }' +
      '#pin-ring { animation: pinP 14s ease-in-out infinite; }' +

      // Phone wiggle on both notifications
      '@keyframes phoneW { 0%{transform:rotate(0)} 38%{transform:rotate(0)} 40%{transform:rotate(-5deg)} 42%{transform:rotate(5deg)} 44%{transform:rotate(-3deg)} 46%{transform:rotate(0)} 70%{transform:rotate(0)} 72%{transform:rotate(-5deg)} 74%{transform:rotate(5deg)} 76%{transform:rotate(0)} 100%{transform:rotate(0)} }' +
      '#phone-group { animation: phoneW 14s ease-in-out infinite; transform-origin: 274px 175px; }' +

      // START notif visible 38%-62% = 3.4s
      '@keyframes nStart { 0%{opacity:0} 38%{opacity:0} 43%{opacity:1} 62%{opacity:1} 67%{opacity:0} 100%{opacity:0} }' +
      '#notif-start { animation: nStart 14s ease-in-out infinite; }' +
      // STOP notif visible 70%-92% = 3.1s
      '@keyframes nStop { 0%{opacity:0} 70%{opacity:0} 75%{opacity:1} 90%{opacity:1} 95%{opacity:0} 100%{opacity:0} }' +
      '#notif-stop { animation: nStop 14s ease-in-out infinite; }' +

      '@keyframes dStart { 0%,38%,67%,100%{transform:scale(0)} 41%{transform:scale(1.4)} 43%{transform:scale(1)} 63%{transform:scale(1)} 65%{transform:scale(0)} }' +
      '@keyframes dStop  { 0%,70%,95%,100%{transform:scale(0)} 73%{transform:scale(1.4)} 75%{transform:scale(1)} 91%{transform:scale(1)} 93%{transform:scale(0)} }' +
      '#notif-dot-start { animation: dStart 14s ease-in-out infinite; transform-origin: 284px 130px; }' +
      '#notif-dot-stop  { animation: dStop  14s ease-in-out infinite; transform-origin: 284px 130px; }' +

      // Step indicators linger longer
      '@keyframes s1a { 0%{opacity:.2} 22%{opacity:.2} 36%{opacity:1} 48%{opacity:1} 53%{opacity:.2} 100%{opacity:.2} }' +
      '@keyframes s2a { 0%{opacity:.2} 38%{opacity:.2} 46%{opacity:1} 62%{opacity:1} 67%{opacity:.2} 100%{opacity:.2} }' +
      '@keyframes s3a { 0%{opacity:.2} 58%{opacity:.2} 66%{opacity:1} 74%{opacity:1} 78%{opacity:.2} 100%{opacity:.2} }' +
      '@keyframes s4a { 0%{opacity:.2} 72%{opacity:.2} 78%{opacity:1} 91%{opacity:1} 96%{opacity:.2} 100%{opacity:.2} }' +
      '#step1{animation:s1a 14s ease-in-out infinite}' +
      '#step2{animation:s2a 14s ease-in-out infinite}' +
      '#step3{animation:s3a 14s ease-in-out infinite}' +
      '#step4{animation:s4a 14s ease-in-out infinite}' +
      '</style>' +

      // BACKGROUND
      '<rect width="340" height="380" fill="var(--bg)"/>' +

      // ROAD — wider, more prominent
      '<rect x="0" y="178" width="340" height="44" fill="#1e3560"/>' +
      '<rect x="0" y="194" width="340" height="12" fill="#243d6e"/>' +
      '<rect x="8"  y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="52" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="96" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="140" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="184" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="228" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="272" y="197" width="28" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +
      '<rect x="316" y="197" width="20" height="6" rx="3" fill="rgba(255,255,255,0.22)"/>' +

      // PARKING SPOT
      '<g id="parking-spot">' +
      '<rect x="14" y="120" width="80" height="58" rx="7" fill="rgba(247,209,23,0.14)" stroke="rgba(247,209,23,0.55)" stroke-width="2" stroke-dasharray="6,4"/>' +
      '</g>' +
      '<text id="p-icon" x="54" y="158" text-anchor="middle" font-size="28" font-family="sans-serif" font-weight="900" fill="#F7D117" opacity="0.3">P</text>' +

      // LOCATION PIN (larger)
      '<g id="location-pin">' +
      '<circle id="pin-ring" cx="54" cy="120" r="0" fill="none" stroke="#F7D117" stroke-width="2.5" opacity="0"/>' +
      '<ellipse cx="54" cy="130" rx="5" ry="2.5" fill="rgba(0,0,0,0.18)"/>' +
      '<path d="M54 100 C45 100 38 107 38 114 C38 124 54 136 54 136 C54 136 70 124 70 114 C70 107 63 100 54 100Z" fill="#F7D117"/>' +
      '<circle cx="54" cy="114" r="5" fill="#002D72"/>' +
      '</g>' +

      // CAR — bigger (76x36)
      '<g id="car">' +
      '<rect x="16" y="145" width="76" height="34" rx="9" fill="#002D72"/>' +
      '<rect x="24" y="126" width="54" height="24" rx="7" fill="#0040a0"/>' +
      '<rect x="28" y="129" width="22" height="17" rx="3" fill="rgba(180,220,255,0.7)"/>' +
      '<rect x="54" y="129" width="20" height="17" rx="3" fill="rgba(180,220,255,0.7)"/>' +
      '<circle cx="30" cy="180" r="10" fill="#111"/><circle cx="30" cy="180" r="5.5" fill="#444"/>' +
      '<circle cx="76" cy="180" r="10" fill="#111"/><circle cx="76" cy="180" r="5.5" fill="#444"/>' +
      '<g id="headlights"><rect x="90" y="151" width="6" height="10" rx="2.5" fill="#fffde0" opacity="0.85"/></g>' +
      '<g id="brakelights"><rect x="12" y="151" width="6" height="10" rx="2.5" fill="#ff4444" opacity="0"/></g>' +
      '</g>' +

      // PHONE — larger (72x118)
      '<g id="phone-group">' +
      '<rect x="248" y="96" width="72" height="118" rx="13" fill="#1a2a4a"/>' +
      '<rect x="254" y="106" width="60" height="100" rx="8" fill="#0d1e3c"/>' +
      '<rect x="271" y="101" width="26" height="6" rx="3" fill="#111"/>' +
      '<rect x="264" y="216" width="34" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>' +

      // START notification (green) — bigger text
      '<g id="notif-start">' +
      '<rect x="255" y="113" width="58" height="48" rx="7" fill="#0d3d1a"/>' +
      '<rect x="258" y="117" width="8" height="8" rx="2" fill="#F7D117"/>' +
      '<text x="270" y="124" font-size="7" font-family="sans-serif" font-weight="700" fill="rgba(255,255,255,0.7)">ParkGuard</text>' +
      '<text x="257" y="136" font-size="8.5" font-family="sans-serif" font-weight="700" fill="#6dff9a">Parking started</text>' +
      '<text x="257" y="148" font-size="6.5" font-family="sans-serif" fill="rgba(255,255,255,0.6)">Zone B detected</text>' +
      '<text x="257" y="158" font-size="6" font-family="sans-serif" fill="rgba(255,255,255,0.38)">Just now • auto-detected</text>' +
      '</g>' +

      // STOP notification (orange)
      '<g id="notif-stop">' +
      '<rect x="255" y="113" width="58" height="48" rx="7" fill="#3d1a00"/>' +
      '<rect x="258" y="117" width="8" height="8" rx="2" fill="#F7D117"/>' +
      '<text x="270" y="124" font-size="7" font-family="sans-serif" font-weight="700" fill="rgba(255,255,255,0.7)">ParkGuard</text>' +
      '<text x="257" y="136" font-size="8.5" font-family="sans-serif" font-weight="700" fill="#ffb347">Parking stopped</text>' +
      '<text x="257" y="148" font-size="6.5" font-family="sans-serif" fill="rgba(255,255,255,0.6)">48m · €1.60 saved</text>' +
      '<text x="257" y="158" font-size="6" font-family="sans-serif" fill="rgba(255,255,255,0.38)">Just now • auto-stopped</text>' +
      '</g>' +

      // notification dots
      '<circle id="notif-dot-start" cx="284" cy="100" r="8" fill="#6dff9a" stroke="#0d3d1a" stroke-width="1.5" transform="scale(0)" style="transform-origin:284px 100px"/>' +
      '<circle id="notif-dot-stop"  cx="284" cy="100" r="8" fill="#ffb347" stroke="#3d1a00" stroke-width="1.5" transform="scale(0)" style="transform-origin:284px 100px"/>' +
      '</g>' +

      // STEP INDICATORS (larger boxes)
      '<g id="step1" opacity="0.2">' +
      '<rect x="8" y="238" width="68" height="42" rx="8" fill="rgba(0,45,114,0.1)" stroke="rgba(90,138,196,0.3)" stroke-width="1"/>' +
      '<text x="42" y="256" text-anchor="middle" font-size="15" fill="#5a8ac4">&#x1F697;</text>' +
      '<text x="42" y="272" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="600" fill="#5a8ac4">Drive &amp; Park</text>' +
      '</g>' +
      '<g id="step2" opacity="0.2">' +
      '<rect x="86" y="238" width="68" height="42" rx="8" fill="rgba(0,45,114,0.1)" stroke="rgba(90,138,196,0.3)" stroke-width="1"/>' +
      '<text x="120" y="256" text-anchor="middle" font-size="15" fill="#5a8ac4">&#x1F4CD;</text>' +
      '<text x="120" y="272" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="600" fill="#5a8ac4">Auto-detected</text>' +
      '</g>' +
      '<g id="step3" opacity="0.2">' +
      '<rect x="164" y="238" width="68" height="42" rx="8" fill="rgba(0,45,114,0.1)" stroke="rgba(90,138,196,0.3)" stroke-width="1"/>' +
      '<text x="198" y="256" text-anchor="middle" font-size="15" fill="#5a8ac4">&#x1F6E3;&#xFE0F;</text>' +
      '<text x="198" y="272" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="600" fill="#5a8ac4">Drive away</text>' +
      '</g>' +
      '<g id="step4" opacity="0.2">' +
      '<rect x="242" y="238" width="90" height="42" rx="8" fill="rgba(0,45,114,0.1)" stroke="rgba(90,138,196,0.3)" stroke-width="1"/>' +
      '<text x="287" y="256" text-anchor="middle" font-size="15" fill="#5a8ac4">&#x2705;</text>' +
      '<text x="287" y="272" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="600" fill="#5a8ac4">Auto-stopped</text>' +
      '</g>' +
      // arrows
      '<path d="M76 259 L86 259" stroke="rgba(90,138,196,0.4)" stroke-width="1.5" marker-end="url(#arr)"/>' +
      '<path d="M154 259 L164 259" stroke="rgba(90,138,196,0.4)" stroke-width="1.5" marker-end="url(#arr)"/>' +
      '<path d="M232 259 L242 259" stroke="rgba(90,138,196,0.4)" stroke-width="1.5" marker-end="url(#arr)"/>' +
      '<defs><marker id="arr" markerWidth="7" markerHeight="7" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3Z" fill="rgba(90,138,196,0.5)"/></marker></defs>' +

      // motto — two lines
      '<text x="170" y="306" text-anchor="middle" font-size="11.5" font-family="sans-serif" font-weight="700" fill="#5a8ac4">Smart parking that stops when you drive away</text>' +
      '<text x="170" y="322" text-anchor="middle" font-size="10" font-family="sans-serif" fill="rgba(90,138,196,0.75)">— so you never overpay.</text>' +
            '</svg>' +
      '</div></div>';
    nav.innerHTML = '<button class="btn btn-navy" onclick="obStep=1;renderOB()">Get Started &#x2192;</button>' +
      '<div style="text-align:center;margin-top:10px;"><span style="font-size:13px;color:var(--muted);cursor:pointer;" onclick="finishOB()">Skip setup</span></div>';
  /* ---- STEP 1: PERMISSIONS ---- */
  } else if (obStep === 1) {
    body.innerHTML = '<div class="ob-body">' +
      '<div style="font-size:26px;font-weight:800;margin-bottom:6px;">Permissions</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5;">ParkGuard needs access to a few things to work its magic in the background.</div>' +
      [['&#128205;','Location','permLocation','Detects your parking zone and exemptions'],['&#128241;','Motion','permMotion','Accelerometer to auto-detect parking and driving'],['&#128276;','Notifications','permNotif','Alerts for driving detection and budget limits']].map(function(p) {
        return '<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
          '<div style="width:40px;height:40px;background:rgba(0,45,114,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+p[0]+'</div>' +
          '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">'+p[1]+'</div><div style="font-size:11px;color:var(--muted);">'+p[3]+'</div></div>' +
          '<label class="sw"><input type="checkbox" '+(S[p[2]]?'checked':'')+' onchange="S[\''+p[2]+'\']=this.checked"><span class="sw-track"></span></label></div>';
      }).join('') + '</div>';
    nav.innerHTML = '<button class="btn btn-primary" onclick="S.permLocation=S.permMotion=S.permNotif=true;obStep=2;renderOB()">Allow All</button>' +
      '<button class="btn btn-ghost" onclick="obStep=2;renderOB()">Allow Selected</button>' +
      '<div style="text-align:center;margin-top:8px;"><span style="font-size:12px;color:var(--muted);cursor:pointer;" onclick="obStep=2;renderOB()">Continue without permissions</span></div>';

  /* ---- STEP 2: CONNECT APPS ---- */
  } else if (obStep === 2) {
    var appRows = Object.entries(S.connectedApps).map(function(entry) {
      var app=entry[0], conn=entry[1];
      return '<div class="app-connect-row '+(conn?'connected':'')+'" onclick="S.connectedApps[\''+app+'\']=!S.connectedApps[\''+app+'\'];renderOB()">' +
        '<div class="app-logo" style="background:'+(conn?'var(--navy)':'var(--bg)')+';border:1px solid var(--border);color:'+(conn?'var(--yellow)':'var(--muted)')+';">'+app[0]+'</div>' +
        '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">'+app+'</div><div style="font-size:11px;color:var(--muted);">'+(conn?'Connected \u2714':'Tap to connect')+'</div></div>' +
        '<div style="width:10px;height:10px;border-radius:50%;background:'+(conn?'#52d68a':'var(--border)')+';"></div></div>';
    }).join('');
    var customRows = Object.entries(S.customApps).map(function(entry) {
      var app=entry[0], conn=entry[1];
      return '<div class="app-connect-row '+(conn?'connected':'')+'" onclick="S.customApps[\''+app+'\']=!S.customApps[\''+app+'\'];renderOB()">' +
        '<div class="app-logo" style="background:'+(conn?'var(--navy)':'var(--bg)')+';border:1px solid var(--border);color:'+(conn?'var(--yellow)':'var(--muted)')+';">'+app[0]+'</div>' +
        '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">'+app+'</div><div style="font-size:11px;color:var(--muted);">'+(conn?'Connected \u2714':'Tap to connect')+'</div></div>' +
        '<div style="width:10px;height:10px;border-radius:50%;background:'+(conn?'#52d68a':'var(--border)')+';"></div></div>';
    }).join('');
    body.innerHTML = '<div class="ob-body">' +
      '<div style="font-size:26px;font-weight:800;margin-bottom:6px;">Connect Apps</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">Tap an app to connect it. ParkGuard will link with your parking apps to manage sessions.</div>' +
      appRows + customRows +
      '</div>';
    nav.innerHTML = '<button class="btn btn-primary" onclick="obStep=3;renderOB()">Continue</button>';

  } else if (obStep === 3) {
    // Step: Exempt locations — user enters their own postcodes
    body.innerHTML =
      '<div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;">' +
      '<div style="font-size:24px;font-weight:800;margin-bottom:5px;color:var(--text);">Exempt locations</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.55;">Enter your postcode to exempt a location. Typing automatically enables it — or use the toggle to turn it on or off.</div>' +

      // ── HOME CARD ──────────────────────────────────────────────────────
      '<div style="border:2px solid '+(S.exemptPlaces.home?'var(--navy)':'var(--border)')+';border-radius:14px;margin-bottom:10px;overflow:hidden;transition:border-color 0.2s;">' +
      '<div onclick="tgHome()" style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer;background:'+(S.exemptPlaces.home?'rgba(0,45,114,0.06)':'var(--card)')+';transition:background 0.2s;">' +
      '<div style="width:42px;height:42px;border-radius:11px;background:'+(S.exemptPlaces.home?'var(--navy)':'var(--border)')+';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;transition:background 0.2s;">&#x1F3E0;</div>' +
      '<div style="flex:1;"><div style="font-size:15px;font-weight:700;color:var(--text);">Home</div><div style="font-size:12px;color:var(--muted);">Skip auto-start when you arrive home</div></div>' +
      '<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(S.exemptPlaces.home?'var(--navy)':'var(--border)')+';background:'+(S.exemptPlaces.home?'var(--navy)':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:11px;color:white;flex-shrink:0;transition:all 0.2s;">'+(S.exemptPlaces.home?'&#x2713;':'')+'</div>' +
      '</div>' +
      // Postcode input — always enabled; typing auto-activates the toggle
      '<div style="padding:0 14px 14px;background:rgba(0,45,114,0.03);">' +
      '<div style="font-size:11px;font-weight:500;color:var(--muted);margin-bottom:7px;">Home postcode</div>' +
      '<input type="text" id="ob-home-pc" value="'+S.obHomePC+'" placeholder="e.g. 3011AA" oninput="S.obHomePC=this.value;S.exemptions[0].postcode=this.value.toUpperCase().trim();var on=this.value.trim().length>0;S.exemptions[0].active=on;if(on!==S.exemptPlaces.home){S.exemptPlaces.home=on;renderOB();}" style="width:100%;background:var(--bg);border:1.5px solid '+(S.exemptPlaces.home?'var(--navy)':'var(--border)')+';border-radius:10px;padding:11px 13px;font-size:16px;color:var(--text);font-family:var(--mono);outline:none;letter-spacing:2px;" maxlength="7" autocomplete="postal-code">' +
      '</div>' +
      '</div>' +

      // ── WORK CARD ──────────────────────────────────────────────────────
      '<div style="border:2px solid '+(S.exemptPlaces.work?'var(--navy)':'var(--border)')+';border-radius:14px;margin-bottom:10px;overflow:hidden;transition:border-color 0.2s;">' +
      '<div onclick="tgWork()" style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer;background:'+(S.exemptPlaces.work?'rgba(0,45,114,0.06)':'var(--card)')+';transition:background 0.2s;">' +
      '<div style="width:42px;height:42px;border-radius:11px;background:'+(S.exemptPlaces.work?'var(--navy)':'var(--border)')+';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;transition:background 0.2s;">&#x1F4BC;</div>' +
      '<div style="flex:1;"><div style="font-size:15px;font-weight:700;color:var(--text);">Work</div><div style="font-size:12px;color:var(--muted);">Skip auto-start at your workplace</div></div>' +
      '<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(S.exemptPlaces.work?'var(--navy)':'var(--border)')+';background:'+(S.exemptPlaces.work?'var(--navy)':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:11px;color:white;flex-shrink:0;transition:all 0.2s;">'+(S.exemptPlaces.work?'&#x2713;':'')+'</div>' +
      '</div>' +
      // Postcode input — always enabled; typing auto-activates the toggle
      '<div style="padding:0 14px 14px;background:rgba(0,45,114,0.03);">' +
      '<div style="font-size:11px;font-weight:500;color:var(--muted);margin-bottom:7px;">Work postcode</div>' +
      '<input type="text" id="ob-work-pc" value="'+S.obWorkPC+'" placeholder="e.g. 3013AP" oninput="S.obWorkPC=this.value;S.exemptions[1].postcode=this.value.toUpperCase().trim();var on=this.value.trim().length>0;S.exemptions[1].active=on;if(on!==S.exemptPlaces.work){S.exemptPlaces.work=on;renderOB();}" style="width:100%;background:var(--bg);border:1.5px solid '+(S.exemptPlaces.work?'var(--navy)':'var(--border)')+';border-radius:10px;padding:11px 13px;font-size:16px;color:var(--text);font-family:var(--mono);outline:none;letter-spacing:2px;" maxlength="7" autocomplete="postal-code">' +
      '</div>' +
      '</div>' +

      // ── OTHER LOCATIONS ────────────────────────────────────────────────
      '<div style="border:1.5px solid var(--border);border-radius:14px;padding:14px 15px;background:var(--card);">' +
      '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px;">&#x1F4CD; Other locations</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Add any other postcode where you want to skip auto-start.</div>' +

      // Tags for already-added extras (exemptions beyond index 1)
      (S.exemptions.length > 2 ?
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' +
        S.exemptions.slice(2).map(function(e, i) {
          return '<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(0,45,114,0.08);border:1px solid var(--border);border-radius:20px;padding:4px 11px;font-size:12px;">' +
            '<span style="font-weight:600;color:var(--text);">' + e.label + '</span>' +
            '<span style="font-size:10px;color:var(--muted);font-family:var(--mono);">' + e.postcode + '</span>' +
            '<span onclick="S.exemptions.splice(' + (i+2) + ',1);renderOB()" style="color:var(--muted);cursor:pointer;font-size:15px;line-height:1;margin-left:2px;">&times;</span>' +
            '</div>';
        }).join('') +
        '</div>'
      : '') +

      '<div style="display:flex;gap:8px;">' +
      '<input type="text" id="ob-new-pc" placeholder="Postcode e.g. 3011AA" style="flex:1;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font);outline:none;">' +
      '<input type="text" id="ob-new-lbl" placeholder="Label" style="width:82px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--font);outline:none;">' +
      '<button onclick="addExFromOB()" style="padding:9px 15px;background:var(--navy);color:var(--yellow);border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">+</button>' +
      '</div>' +
      '</div>' +

      '</div>';
    nav.innerHTML = '<button class="btn btn-primary" onclick="obStep=4;renderOB()">Continue</button>' +
      '<div style="text-align:center;margin-top:8px;"><span style="font-size:12px;color:var(--muted);cursor:pointer;" onclick="obStep=4;renderOB()">Skip for now</span></div>';

  /* ---- STEP 3: PREFERENCES ---- */
  } else if (obStep === 4) {
    body.innerHTML = '<div class="ob-body">' +
      '<div style="font-size:26px;font-weight:800;margin-bottom:6px;">Preferences</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:18px;line-height:1.5;">Configure how ParkGuard behaves when it detects changes in your driving.</div>' +

      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">When you START driving</div>' +
      '<div class="radio-opt '+(S.driveMode==='auto'?'sel':'')+'" onclick="S.driveMode=\'auto\';S.autoStopEnabled=true;renderOB()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;">Auto-Stop Session</div><div style="font-size:12px;color:var(--muted);">Automatically end session after countdown</div></div></div>' +
      '<div class="radio-opt '+(S.driveMode==='notify'?'sel':'')+'" onclick="S.driveMode=\'notify\';S.autoStopEnabled=false;renderOB()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;">Send Notification</div><div style="font-size:12px;color:var(--muted);">Notify you but keep session running</div></div></div>' +

      '<div style="height:1px;background:var(--border);margin:16px 0;"></div>' +

      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">When you STOP driving</div>' +
      '<div class="radio-opt '+(S.stopMode==='auto'?'sel':'')+'" onclick="S.stopMode=\'auto\';renderOB()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Auto-Start New Session</div><div style="font-size:12px;color:var(--muted);">Begin a new parking session automatically</div></div></div>' +
      '<div class="radio-opt '+(S.stopMode==='notify'?'sel':'')+'" onclick="S.stopMode=\'notify\';renderOB()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;">Send Notification</div><div style="font-size:12px;color:var(--muted);">Remind you to start a session manually</div></div></div>' +
      '<div class="radio-opt '+(S.stopMode==='nothing'?'sel':'')+'" onclick="S.stopMode=\'nothing\';renderOB()"><div class="rdot"><div class="rin"></div></div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Do Nothing</div><div style="font-size:12px;color:var(--muted);">Manage sessions manually</div></div></div>' +

      '<div style="height:1px;background:var(--border);margin:16px 0;"></div>' +

      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;">Budget Limit (optional)</div>' +
      '<div class="sw-row"><div style="font-weight:500;font-size:13px;">Enable session budget</div>' +
      '<label class="sw"><input type="checkbox" '+(S.budgetEnabled?'checked':'')+' onchange="S.budgetEnabled=this.checked;renderOB()"><span class="sw-track"></span></label></div>' +
      (S.budgetEnabled?'<div style="display:flex;align-items:center;gap:8px;margin-top:10px;"><span style="font-weight:700;">&euro;</span><input type="number" value="'+S.budgetAmount+'" min="0.5" max="50" step="0.5" onchange="S.budgetAmount=parseFloat(this.value)||5" style="width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 12px;font-size:14px;color:var(--text);font-family:var(--mono);outline:none;"></div>':'') +
      '</div>';
    nav.innerHTML = '<button class="btn btn-primary" onclick="obStep=5;renderOB()">Continue</button>';

  /* ---- STEP 4: ALL SET ---- */
  } else if (obStep === 5) {
    var connCount = Object.values(allApps()).filter(function(v){ return v; }).length;
    body.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:8px;">' +
      '<div style="padding:0 24px 24px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">&#x1F3C6;</div>' +
      '<div style="font-size:28px;font-weight:800;margin-bottom:10px;">All set!</div>' +
      '<div style="font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:20px;">ParkGuard is ready. Here\'s a quick summary of your setup:</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--rad-sm);padding:10px 14px;display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:16px;">&#x1F4F1;</span><span style="font-size:13px;">Auto-start: <strong>Activity mode + dwell time fallback</strong></span></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--rad-sm);padding:10px 14px;display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:16px;">'+(S.driveMode==='auto'?'&#x23F9;&#xFE0F;':'&#x1F514;')+'</span><span style="font-size:13px;">When driving: <strong>'+(S.driveMode==='auto'?'Auto-stop session':'Send notification')+'</strong></span></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--rad-sm);padding:10px 14px;display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:16px;">&#x1F17F;&#xFE0F;</span><span style="font-size:13px;">When parked: <strong>'+(S.stopMode==='auto'?'Auto-start session':S.stopMode==='notify'?'Send notification':'Manual only')+'</strong></span></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--rad-sm);padding:10px 14px;display:flex;align-items:center;gap:10px;">' +
      '<span style="font-size:16px;">&#x1F4B3;</span><span style="font-size:13px;"><strong>'+connCount+'</strong> parking app'+(connCount!==1?'s':'')+' connected</span></div>' +
      '</div></div></div>';
    nav.innerHTML = '<button class="btn btn-primary" onclick="finishOB()">Start Using ParkGuard</button>';
  }
}

function showAddCustomAppInOB() {
  var d = document.getElementById('ob-custom-add');
  if (d) d.classList.toggle('hidden');
}

function addCustomAppOB() {
  var name = document.getElementById('ob-custom-name');
  if (!name || !name.value.trim()) return;
  S.customApps[name.value.trim()] = false;
  name.value = '';
  renderOB();
}

function tgHome() {
  S.exemptPlaces.home = !S.exemptPlaces.home;
  if (!S.exemptPlaces.home) {
    // Toggling OFF — clear postcode and deactivate exemption
    S.obHomePC = '';
    S.exemptions[0].postcode = '';
    S.exemptions[0].active = false;
  }
  renderOB();
  if (S.exemptPlaces.home) {
    setTimeout(function() { var i = document.getElementById('ob-home-pc'); if (i) { i.focus(); i.select(); } }, 60);
  }
}
function tgWork() {
  S.exemptPlaces.work = !S.exemptPlaces.work;
  if (!S.exemptPlaces.work) {
    // Toggling OFF — clear postcode and deactivate exemption
    S.obWorkPC = '';
    S.exemptions[1].postcode = '';
    S.exemptions[1].active = false;
  }
  renderOB();
  if (S.exemptPlaces.work) {
    setTimeout(function() { var i = document.getElementById('ob-work-pc'); if (i) { i.focus(); i.select(); } }, 60);
  }
}
function addExFromOB() {
  var pc = document.getElementById('ob-new-pc');
  var lbl = document.getElementById('ob-new-lbl');
  if (!pc || !pc.value.trim()) return;
  var label = (lbl && lbl.value.trim()) ? lbl.value.trim() : pc.value.toUpperCase().trim();
  S.exemptions.push({ label: label, postcode: pc.value.toUpperCase().trim(), active: true });
  pc.value = '';
  if (lbl) lbl.value = '';
  renderOB();
}

function finishOB() {
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  renderHome(); renderApps(); renderHistory(); renderSettings();
  startTick();
}

/* ====== exported to window: the markup uses inline on* handlers ====== */
Object.assign(window, { S: S, LOCS: LOCS, loc, cost, fmtTime, fmtFull, pad, euro, allApps, toggleDark, toggleDev, showTab, startTick, updateDevState, updateDisplay, showBanner, dismissBanner, isExempt, startSession, stopSession, setSpeed, updateDwellStatus, runQuickTest, updateZones, showLock, hideLock, lockStopTap, lockStopCancel, renderLockButtons, updateLockClock, openMap, closeMap, changeLocation, openSheet, closeSheet, confirmSheet, addCustomApp, addExemption, toggleExemption, removeExemption, renderSessionCard, renderHome, renderDevTools, resetDevState, renderApps, setHV, renderHistory, renderInsights, renderSessions, renderSettings, showOnboarding, renderOB, showAddCustomAppInOB, addCustomAppOB, tgHome, tgWork, addExFromOB, finishOB });
export { S, LOCS, renderHome, renderSettings, showBanner, dismissBanner, startSession, stopSession, updateDwellStatus, showOnboarding };
