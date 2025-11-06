const API_BASE = window.location.origin;

// State management
let state = {
  currentView: 'home',
  currentEvent: null,
  images: [],
  currentImageIndex: 0,
  voterId: localStorage.getItem('voterId') || null,
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Check for QR code in URL
  const urlParams = new URLSearchParams(window.location.search);
  const qrCode = urlParams.get('qr');
  
  if (qrCode) {
    joinEventByQR(qrCode);
  } else {
    render();
  }
  
  setupEventListeners();
});

async function joinEventByQR(qrCode) {
  try {
    const response = await fetch(`${API_BASE}/api/events/qr/${qrCode}`);
    if (!response.ok) {
      throw new Error('Event not found');
    }

    const event = await response.json();
    
    // Get full event data with images
    const fullEventResponse = await fetch(`${API_BASE}/api/events/${event.id}`);
    const fullEvent = await fullEventResponse.json();
    
    state.currentEvent = fullEvent;
    state.images = fullEvent.images || [];
    state.currentImageIndex = 0;
    state.currentView = 'voting';
    
    render();
    setupStarRating();
  } catch (error) {
    alert('Error joining event: ' + error.message);
    render();
  }
}

function setupEventListeners() {
  // Navigation
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action]')) {
      const action = e.target.getAttribute('data-action');
      handleAction(action, e.target);
    }
  });
}

function handleAction(action, element) {
  switch (action) {
    case 'create-event':
      showCreateEvent();
      break;
    case 'admin':
      showAdmin();
      break;
    case 'scan-qr':
      showQRScanner();
      break;
    case 'submit-event':
      createEvent(element);
      break;
    case 'upload-image':
      triggerFileUpload();
      break;
    case 'start-event':
      startEvent(element);
      break;
    case 'view-qr':
      showQRCode(element);
      break;
    case 'back':
      state.currentView = 'home';
      render();
      break;
  }
}

function render() {
  const root = document.getElementById('root');
  
  switch (state.currentView) {
    case 'home':
      root.innerHTML = renderHome();
      break;
    case 'admin':
      root.innerHTML = renderAdmin();
      break;
    case 'create-event':
      root.innerHTML = renderCreateEvent();
      break;
    case 'voting':
      root.innerHTML = renderVoting();
      break;
    case 'qr-scanner':
      root.innerHTML = renderQRScanner();
      break;
    default:
      root.innerHTML = renderHome();
  }
}

function renderHome() {
  return `
    <div class="container">
      <div class="header">
        <h1>⭐ Star Voting System</h1>
        <p>Create events, upload images, and let people vote with stars!</p>
      </div>
      <div class="card">
        <h2>Get Started</h2>
        <div style="display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap;">
          <button class="btn" data-action="admin">Admin Panel</button>
          <button class="btn btn-secondary" data-action="scan-qr">Scan QR Code to Vote</button>
        </div>
      </div>
    </div>
  `;
}

function renderCreateEvent() {
  return `
    <div class="container">
      <div class="header">
        <h1>Create New Event</h1>
      </div>
      <div class="card">
        <form id="event-form">
          <div class="input-group">
            <label for="event-name">Event Name</label>
            <input type="text" id="event-name" required placeholder="Enter event name">
          </div>
          <button type="submit" class="btn" data-action="submit-event">Create Event</button>
          <button type="button" class="btn btn-secondary" data-action="back">Cancel</button>
        </form>
      </div>
    </div>
  `;
}

function renderAdmin() {
  return `
    <div class="container">
      <div class="header">
        <h1>Admin Panel</h1>
      </div>
      <div class="card">
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <button class="btn" data-action="create-event">Create New Event</button>
          <button class="btn btn-secondary" data-action="back">Back to Home</button>
        </div>
        <div id="events-list" style="margin-top: 30px;"></div>
      </div>
    </div>
  `;
}

function renderVoting() {
  if (!state.currentEvent || state.images.length === 0) {
    return `
      <div class="container">
        <div class="card">
          <div class="loading">Loading event...</div>
        </div>
      </div>
    `;
  }

  const currentImage = state.images[state.currentImageIndex];
  const voteStats = state.currentEvent.voteStats || [];
  const stats = voteStats.find(s => s.image_id === currentImage.id) || { avg_stars: 0, vote_count: 0 };

  return `
    <div class="container">
      <div class="header">
        <h1>${state.currentEvent.name}</h1>
        <span class="status-badge status-${state.currentEvent.status}">${state.currentEvent.status}</span>
      </div>
      <div class="card voting-interface">
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${state.currentImageIndex + 1}</div>
            <div class="stat-label">of ${state.images.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.avg_stars ? stats.avg_stars.toFixed(1) : '0.0'}</div>
            <div class="stat-label">Avg Rating</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${stats.vote_count || 0}</div>
            <div class="stat-label">Votes</div>
          </div>
        </div>
        <img src="${currentImage.url}" alt="${currentImage.filename}" class="voting-image">
        <div class="star-rating" id="star-rating">
          ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-stars="${i}">⭐</span>`).join('')}
        </div>
        <div style="margin-top: 20px;">
          <button class="btn" ${state.currentImageIndex === 0 ? 'disabled' : ''} onclick="previousImage()">Previous</button>
          <button class="btn btn-success" onclick="submitVote()">Submit Vote</button>
          <button class="btn" ${state.currentImageIndex === state.images.length - 1 ? 'disabled' : ''} onclick="nextImage()">Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderQRScanner() {
  return `
    <div class="container">
      <div class="header">
        <h1>Scan QR Code</h1>
      </div>
      <div class="card scanner-container">
        <video id="scanner-video" autoplay playsinline></video>
        <canvas id="scanner-canvas" class="hidden"></canvas>
        <p>Point your camera at the QR code to join the event</p>
        <button class="btn btn-secondary" data-action="back" style="margin-top: 20px;">Cancel</button>
      </div>
    </div>
  `;
}

// API Functions
async function createEvent(button) {
  const form = button.closest('form');
  const name = form.querySelector('#event-name').value;
  
  if (!name) {
    alert('Please enter an event name');
    return;
  }

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const response = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to create event';
      const errorDetails = errorData.details || errorData.hint || '';
      throw new Error(errorMessage + (errorDetails ? '\n\n' + errorDetails : ''));
    }

    const event = await response.json();
    
    // Create join URL for QR code
    const joinUrl = `${window.location.origin}?qr=${event.qr_code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div class="card" style="max-width: 500px; text-align: center;">
        <h2>Event Created Successfully!</h2>
        <h3>${event.name}</h3>
        <img src="${qrUrl}" alt="QR Code" style="margin: 20px 0; border: 4px solid #667eea; border-radius: 8px; padding: 10px; background: white;">
        <p><strong>QR Code:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${event.qr_code}</code></p>
        <p style="margin: 10px 0; color: #666;">Share this QR code with participants</p>
        <p style="margin: 10px 0; color: #666; font-size: 0.9rem;"><strong>Event ID:</strong> ${event.id}</p>
        <div style="margin-top: 20px;">
          <button class="btn" onclick="uploadImageForEvent('${event.id}')">Upload Images</button>
          <button class="btn btn-secondary" onclick="this.closest('div[style*=\"position: fixed\"]').remove(); state.currentView='admin'; render(); loadEvents();">Done</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    alert('Error creating event: ' + error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Create Event';
  }
}

function uploadImageForEvent(eventId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadButton = document.createElement('div');
    uploadButton.innerHTML = `<div class="loading">Uploading ${files.length} image(s)...</div>`;
    document.body.appendChild(uploadButton);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventId', eventId);

      try {
        const response = await fetch(`${API_BASE}/api/images`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    uploadButton.remove();
    alert(`Upload complete! ${successCount} successful, ${errorCount} failed.`);
  };
  input.click();
}

window.uploadImageForEvent = uploadImageForEvent;

async function startEvent(button) {
  const eventId = button.getAttribute('data-event-id');
  
  try {
    const response = await fetch(`${API_BASE}/api/events/${eventId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });

    if (response.ok) {
      alert('Event started!');
      state.currentView = 'admin';
      render();
    }
  } catch (error) {
    alert('Error starting event: ' + error.message);
  }
}

function showQRCode(button) {
  const qrCode = button.getAttribute('data-qr-code');
  const eventName = button.getAttribute('data-event-name') || 'Event';
  
  // Create join URL for QR code
  const joinUrl = `${window.location.origin}?qr=${qrCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
  
  // Show modal with QR code
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div class="card" style="max-width: 500px; text-align: center;">
      <h2>${eventName} - QR Code</h2>
      <img src="${qrUrl}" alt="QR Code" style="margin: 20px 0; border: 4px solid #667eea; border-radius: 8px; padding: 10px; background: white;">
      <p><strong>QR Code:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${qrCode}</code></p>
      <p style="margin: 10px 0; color: #666;">Share this QR code or code with participants</p>
      <button class="btn" onclick="this.closest('div[style*=\"position: fixed\"]').remove()">Close</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function triggerFileUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const eventId = prompt('Enter Event ID:');
    if (!eventId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId);

    try {
      const response = await fetch(`${API_BASE}/api/images`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      alert('Image uploaded successfully!');
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    }
  };
  input.click();
}

async function submitVote() {
  const stars = document.querySelector('.star.active')?.getAttribute('data-stars');
  if (!stars) {
    alert('Please select a rating');
    return;
  }

  const currentImage = state.images[state.currentImageIndex];
  
  try {
    const response = await fetch(`${API_BASE}/api/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: state.currentEvent.id,
        image_id: currentImage.id,
        stars: parseInt(stars),
        voter_id: state.voterId,
      }),
    });

    const result = await response.json();
    if (result.voter_id) {
      state.voterId = result.voter_id;
      localStorage.setItem('voterId', result.voter_id);
    }
    
    alert('Vote submitted!');
    nextImage();
  } catch (error) {
    alert('Error submitting vote: ' + error.message);
  }
}

function nextImage() {
  if (state.currentImageIndex < state.images.length - 1) {
    state.currentImageIndex++;
    render();
    setupStarRating();
  }
}

function previousImage() {
  if (state.currentImageIndex > 0) {
    state.currentImageIndex--;
    render();
    setupStarRating();
  }
}

function setupStarRating() {
  setTimeout(() => {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-stars'));
        stars.forEach((s, i) => {
          if (i < rating) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });
  }, 100);
}

function showCreateEvent() {
  state.currentView = 'create-event';
  render();
}

function showAdmin() {
  state.currentView = 'admin';
  render();
  loadEvents();
}

async function loadEvents() {
  const eventsList = document.getElementById('events-list');
  eventsList.innerHTML = '<div class="loading">Loading events...</div>';
  
  // Note: In production, you'd have a GET /api/events endpoint
  // For now, we'll show a message to create events
  eventsList.innerHTML = `
    <div class="card" style="background: #f8f9fa;">
      <h3>Your Events</h3>
      <p>Create your first event to get started! Events you create will appear here.</p>
      <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">
        <strong>Tip:</strong> After creating an event, you'll receive a QR code. 
        Share this code with participants so they can join and vote.
      </p>
    </div>
  `;
}

function showQRScanner() {
  state.currentView = 'qr-scanner';
  render();
  
  // Initialize QR scanner
  setTimeout(() => {
    initQRScanner();
  }, 100);
}

function initQRScanner() {
  const video = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-canvas');
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      video.srcObject = stream;
      // In production, use a QR code scanning library like jsQR
      // For now, we'll add a manual input option
      addManualQRInput();
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      addManualQRInput();
    });
}

function addManualQRInput() {
  const scannerContainer = document.querySelector('.scanner-container');
  scannerContainer.innerHTML += `
    <div style="margin-top: 20px;">
      <p>Or enter QR code manually:</p>
      <input type="text" id="manual-qr-input" placeholder="Enter QR code" style="padding: 10px; width: 100%; max-width: 400px; margin: 10px 0;">
      <button class="btn" onclick="joinEvent()">Join Event</button>
    </div>
  `;
}

async function joinEvent() {
  const qrInput = document.getElementById('manual-qr-input');
  let qrCode = qrInput.value.trim();
  
  if (!qrCode) {
    alert('Please enter a QR code');
    return;
  }

  // Extract QR code from URL if full URL is provided
  if (qrCode.includes('?qr=')) {
    const url = new URL(qrCode);
    qrCode = url.searchParams.get('qr') || qrCode;
  }

  await joinEventByQR(qrCode);
}

// Make functions globally available
window.previousImage = previousImage;
window.nextImage = nextImage;
window.submitVote = submitVote;
window.joinEvent = joinEvent;

