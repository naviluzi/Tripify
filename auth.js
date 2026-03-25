// ============================================================
// auth.js — TravelHack SL
// Firebase Auth (Google Sign-In) + Realtime Database trip collection
// ============================================================

(function () {
  'use strict';

  // ── Check Firebase config ────────────────────────────────
  const cfg = window.FIREBASE_CONFIG;
  const configured = cfg && cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY';

  let db, auth, currentUser = null;

  // Expose module API
  window.authModule = {
    onTripPlanned,
    saveCurrentTrip,
    loadUserTrips,
  };

function init() {
    // Check if the bridge has finished starting the engine
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      setTimeout(init, 50); // Loop until initialized
      return;
    }

    try {
      auth = firebase.auth();
      db   = firebase.database();

      auth.onAuthStateChanged(user => {
        currentUser = user;
        renderAuthBtn(user);
        if (user) {
          console.log("Tripify: User Logged In ->", user.displayName);
          loadUserTrips();
        }
      });
    } catch (e) {
      console.error('Bridge Connection Failed:', e.message);
    }
  }


  // ── Sign in / out ────────────────────────────────────────
  function signIn() {
    if (!auth) return;
    const provider = new firebase.auth.GoogleAuthProvider(); // This line now has permission!
    auth.signInWithPopup(provider).catch(err => {
      showToast('Sign-in failed: ' + err.message, 'error');
    });
  }

  function signOut() {
    if (!auth) return;
    auth.signOut().then(() => {
      showToast('Signed out successfully', 'success');
      clearTripsPanel();
    });
  }

  // ── Render auth button in navbar ─────────────────────────
  function renderAuthBtn(user) {
    const container = document.getElementById('authContainer');
    if (!container) return;

    if (!configured) {
      container.innerHTML = `
        <a href="firebase-config.js" target="_blank" class="auth-setup-btn" title="Set up Firebase to enable accounts">
          🔑 Setup Accounts
        </a>`;
      return;
    }

    if (user) {
      const avatar = user.photoURL
        ? `<img src="${user.photoURL}" class="auth-avatar" alt="${user.displayName}" />`
        : `<div class="auth-avatar-initial">${(user.displayName || 'U')[0]}</div>`;
      container.innerHTML = `
        <button class="auth-user-btn" id="authUserBtn" title="${user.displayName}">
          ${avatar}
          <span class="auth-name">${user.displayName?.split(' ')[0] || 'User'}</span>
          <span class="auth-caret">∨</span>
        </button>
        <div class="auth-dropdown" id="authDropdown">
          <button class="auth-dd-item" id="myTripsBtn">📚 My Trips</button>
          <button class="auth-dd-item" id="saveNowBtn" style="display:none">💾 Save Current Trip</button>
          <div class="auth-dd-sep"></div>
          <button class="auth-dd-item auth-signout" id="signOutBtn">Sign Out</button>
        </div>`;

      document.getElementById('authUserBtn').addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('authDropdown').classList.toggle('open');
      });
      document.getElementById('myTripsBtn').addEventListener('click', () => {
        closeAuthDropdown();
        openTripsPanel();
      });
      document.getElementById('signOutBtn').addEventListener('click', () => {
        closeAuthDropdown();
        signOut();
      });
      const saveNowBtn = document.getElementById('saveNowBtn');
      if (saveNowBtn) {
        saveNowBtn.addEventListener('click', () => {
          closeAuthDropdown();
          promptSaveTrip();
        });
      }

      document.addEventListener('click', closeAuthDropdown);
    } else {
      container.innerHTML = `
        <button class="auth-signin-btn" id="signInBtn">
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.3 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.4 12.9 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
            <path fill="#FBBC05" d="M10.4 28.7A14.4 14.4 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.3 0-11.7-4.3-13.6-10l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          Sign In
        </button>`;
      document.getElementById('signInBtn').addEventListener('click', signIn);
    }
  }

  function closeAuthDropdown() {
    document.getElementById('authDropdown')?.classList.remove('open');
  }

  function onTripPlanned() {
    const btn = document.getElementById('saveNowBtn');
    if (btn) btn.style.display = 'flex';
    const inlineSave = document.getElementById('inlineSaveBtn');
    if (inlineSave && currentUser) inlineSave.style.display = 'flex';
  }

  function promptSaveTrip() {
    const name = prompt('Name this trip:', generateTripName());
    if (!name) return;
    saveCurrentTrip(name);
  }

  function generateTripName() {
    const start = document.getElementById('startLocation')?.value || '';
    const dest  = document.getElementById('mainDestination')?.value || '';
    const date  = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    return start && dest ? `${start} → ${dest} (${date})` : `Trip on ${date}`;
  }

  // ── RTDB SAVE ────────────────────────────────────────────
  function saveCurrentTrip(name) {
    if (!currentUser || !db) {
      showToast('Please sign in to save trips', 'error');
      return;
    }
    const result = window.state?.lastResult;
    if (!result) {
      showToast('Plan a trip first before saving', 'error');
      return;
    }

    const tripData = {
      name:         name || generateTripName(),
      createdAt:    firebase.database.ServerValue.TIMESTAMP,
      start:        document.getElementById('startLocation')?.value || '',
      destination:  document.getElementById('mainDestination')?.value || '',
      travelers:    parseInt(document.getElementById('numTravelers')?.value) || 2,
      mode:         document.getElementById('travelMode')?.value || 'car',
      budget:       parseInt(document.getElementById('totalBudget')?.value) || 15000,
      date:         document.getElementById('travelDate')?.value || '',
      stops:        window.state?.stops || [],
      result:       JSON.parse(JSON.stringify(result))
    };

    // Save to trips/UID/uniqueID
    const newTripRef = db.ref('trips/' + currentUser.uid).push();
    newTripRef.set(tripData)
      .then(() => {
        showToast('✦ Trip saved to your collection!', 'success');
        loadUserTrips();
      })
      .catch(err => showToast('Save failed: ' + err.message, 'error'));
  }

  // ── RTDB LOAD ────────────────────────────────────────────
  function loadUserTrips() {
    if (!currentUser || !db) return;

    db.ref('trips/' + currentUser.uid).orderByChild('createdAt').once('value')
      .then(snapshot => {
        const trips = [];
        snapshot.forEach(child => {
          trips.unshift({ id: child.key, ...child.val() }); // unshift to keep newest at top
        });
        renderTripsPanel(trips);
      })
      .catch(err => console.warn('Failed to load trips:', err));
  }

  function openTripsPanel() {
    const panel = document.getElementById('tripsPanel');
    const overlay = document.getElementById('tripsPanelOverlay');
    if (panel)   panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadUserTrips();
  }

  function closeTripsPanel() {
    const panel = document.getElementById('tripsPanel');
    const overlay = document.getElementById('tripsPanelOverlay');
    if (panel)   panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function clearTripsPanel() {
    renderTripsPanel([]);
  }

  function renderTripsPanel(trips) {
    const list = document.getElementById('tripsList');
    if (!list) return;

    if (!trips.length) {
      list.innerHTML = `
        <div class="trips-empty">
          <div class="trips-empty-ico">🗺️</div>
          <p>No saved trips yet.<br/>Plan a trip and tap <strong>Save Trip</strong>.</p>
        </div>`;
      return;
    }

    list.innerHTML = trips.map(trip => {
      const date = trip.createdAt 
        ? new Date(trip.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
        : 'Saved trip';
      
      const km   = trip.result?.totalDistKm ? `${Math.round(trip.result.totalDistKm)} km` : '';
      const cost = trip.result?.budgetBreakdown?.total
        ? `Rs. ${Math.round(trip.result.budgetBreakdown.total).toLocaleString('en-IN')}`
        : '';
      const stops = trip.result?.stops?.length || 0;
      
      return `
        <div class="trip-card" data-id="${trip.id}">
          <div class="trip-card-head">
            <div>
              <div class="trip-card-name">${trip.name}</div>
              <div class="trip-card-date">${date}</div>
            </div>
            <button class="trip-delete" data-id="${trip.id}" title="Delete">✕</button>
          </div>
          <div class="trip-card-route">${trip.start} → ${trip.destination}</div>
          <div class="trip-card-meta">
            ${stops ? `<span>📍 ${stops} stops</span>` : ''}
            ${km    ? `<span>📏 ${km}</span>` : ''}
            ${cost  ? `<span>💰 ${cost}</span>` : ''}
            <span>${{ car:'🚗', bike:'🏍️', bus:'🚌' }[trip.mode] || '🚗'} ${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}</span>
          </div>
          <button class="trip-load-btn" data-id="${trip.id}">Load Trip →</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.trip-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Delete this trip?')) deleteTrip(btn.dataset.id);
      });
    });
    
    list.querySelectorAll('.trip-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const trip = trips.find(t => t.id === btn.dataset.id);
        if (trip) restoreTrip(trip);
      });
    });
  }

  function deleteTrip(id) {
    if (!currentUser || !db) return;
    db.ref('trips/' + currentUser.uid + '/' + id).remove()
      .then(() => { showToast('Trip deleted', 'success'); loadUserTrips(); })
      .catch(err => showToast('Delete failed: ' + err.message, 'error'));
  }

  function restoreTrip(trip) {
    closeTripsPanel();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('startLocation',   trip.start);
    set('mainDestination', trip.destination);
    set('numTravelers',    trip.travelers);
    set('travelMode',      trip.mode);
    set('totalBudget',     trip.budget);
    set('budgetSlider',    trip.budget);
    set('travelDate',      trip.date);

    if (window.state && trip.stops) {
      window.state.stops = trip.stops;
      if (window.renderStops) window.renderStops();
    }

    if (window.updateSliderFill) window.updateSliderFill();

    if (window.state && trip.result) {
      window.state.lastResult     = trip.result;
      window.state.allAttractions = trip.result.attractions || [];
      if (window.renderResults)  window.renderResults(trip.result);
      if (window.showMapRoute)   setTimeout(() => window.showMapRoute(trip.result.stops), 600);
      const ib = document.getElementById('mapInfoBar');
      if (ib) ib.style.display = 'grid';
      const ab = document.getElementById('altRoutesBtn');
      if (ab) ab.style.display = 'block';
    }

    showToast(`✦ Loaded: ${trip.name}`, 'success');
    setTimeout(() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' }), 300);
  }

  function showToast(msg, type) {
    if (window.showToast) { window.showToast(msg, type); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeTripsPanelBtn')?.addEventListener('click', closeTripsPanel);
    document.getElementById('tripsPanelOverlay')?.addEventListener('click', closeTripsPanel);
    document.getElementById('inlineSaveBtn')?.addEventListener('click', promptSaveTrip);
    init();
  });

})();