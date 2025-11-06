const API_BASE = window.location.origin;

// State management
let state = {
  currentView: 'home',
  currentEvent: null,
  images: [],
  currentImageIndex: 0,
  voterId: localStorage.getItem('voterId') || null,
  votedImages: JSON.parse(localStorage.getItem('votedImages') || '[]'),
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    joinEventByCode(code);
  } else {
    render();
  }
  
  setupEventListeners();
});

// Generate or get voter ID
function getVoterId() {
  if (!state.voterId) {
    state.voterId = `voter_${crypto.randomUUID()}`;
    localStorage.setItem('voterId', state.voterId);
  }
  return state.voterId;
}

async function joinEventByCode(code) {
  try {
    const voterId = getVoterId();
    const response = await fetch(`${API_BASE}/api/events/qr/${code}?voter_id=${voterId}`);
    if (!response.ok) {
      throw new Error('Event not found');
    }

    const event = await response.json();
    const fullEventResponse = await fetch(`${API_BASE}/api/events/${event.id}?voter_id=${voterId}`);
    const fullEvent = await fullEventResponse.json();
    
    state.currentEvent = fullEvent;
    state.images = fullEvent.images || [];
    state.currentImageIndex = fullEvent.currentImageIndex || 0;
    state.currentView = 'voting';
    
    render();
    setupStarRating();
    
    if (fullEvent.status === 'active') {
      startPollingForCurrentImage();
    }
  } catch (error) {
    alert('Error joining event: ' + error.message);
    render();
  }
}

let pollingInterval = null;

function startPollingForCurrentImage() {
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(async () => {
    if (!state.currentEvent || state.currentView !== 'voting') {
      clearInterval(pollingInterval);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}?voter_id=${getVoterId()}`);
      const eventData = await response.json();
      
      if (eventData.currentImageIndex !== state.currentImageIndex) {
        state.currentImageIndex = eventData.currentImageIndex;
        state.currentEvent = eventData;
        render();
        setupStarRating();
      }
      
      if (eventData.participantCount !== state.currentEvent.participantCount) {
        state.currentEvent = eventData;
        render();
      }
      
      if (eventData.status === 'closed') {
        clearInterval(pollingInterval);
        showLeaderboard();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 2000);
}

function setupEventListeners() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action]')) {
      const action = e.target.getAttribute('data-action');
      handleAction(action);
    }
  });
}

function handleAction(action) {
  switch (action) {
    case 'admin':
      state.currentView = 'admin';
      render();
      break;
    case 'create-event':
      state.currentView = 'create-event';
      render();
      break;
    case 'back':
      state.currentView = 'home';
      render();
      break;
    case 'submit-event':
      createEvent();
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
    case 'show-code':
      root.innerHTML = renderShowCode();
      break;
    case 'presentation':
      root.innerHTML = renderPresentationView();
      break;
    case 'voting':
      root.innerHTML = renderVoting();
      break;
    case 'leaderboard':
      root.innerHTML = renderLeaderboard();
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
      </div>
      <div class="card">
        <h2>Get Started</h2>
        <div style="display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap;">
          <button class="btn" data-action="admin">Admin Panel</button>
        </div>
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
        <button class="btn" data-action="create-event">Create New Event</button>
        <button class="btn btn-secondary" data-action="back">Back to Home</button>
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

async function createEvent() {
  const nameInput = document.getElementById('event-name');
  const name = nameInput?.value.trim();
  
  if (!name) {
    alert('Please enter an event name');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create event');
    }
    
    const event = await response.json();
    state.currentEvent = event;
    state.currentView = 'show-code';
    render();
    uploadImagesForEvent(event.id);
  } catch (error) {
    alert('Error creating event: ' + error.message);
  }
}

function renderShowCode() {
  if (!state.currentEvent) return '<div class="container"><div class="card">Loading...</div></div>';
  
  return `
    <div class="container">
      <div class="header">
        <h1>${state.currentEvent.name}</h1>
      </div>
      <div class="card" style="text-align: center;">
        <h2 style="margin-bottom: 20px;">Join Code</h2>
        <div class="code-display" id="join-code">${state.currentEvent.qr_code}</div>
        <p style="margin-top: 20px; color: #666;">Share this code with participants</p>
        <p style="margin: 10px 0; color: #666; font-size: 0.9rem;">Participants join at: <code>${window.location.origin}?code=${state.currentEvent.qr_code}</code></p>
        
        <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 1.5rem; font-weight: 600; color: #667eea;" id="participant-count">0</div>
          <div style="color: #666; margin-top: 10px;">Participants Joined</div>
        </div>
        
        <div style="margin-top: 30px;">
          <button class="btn btn-success" id="start-vote-btn" onclick="startVoting()" style="font-size: 1.2rem; padding: 15px 30px;">
            Start Voting
          </button>
        </div>
        
        <div style="margin-top: 20px;">
          <button class="btn btn-secondary" onclick="state.currentView='admin'; render();">Back to Admin</button>
        </div>
      </div>
    </div>
  `;
}

let participantPolling = null;

function startParticipantPolling() {
  if (participantPolling) clearInterval(participantPolling);
  
  participantPolling = setInterval(async () => {
    if (state.currentView !== 'show-code' || !state.currentEvent) {
      clearInterval(participantPolling);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}`);
      const eventData = await response.json();
      const countEl = document.getElementById('participant-count');
      if (countEl) {
        countEl.textContent = eventData.participantCount || 0;
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 1000);
}

async function startVoting() {
  if (!state.currentEvent) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start voting');
    }
    
    if (confirm('Voting started! Open Presentation Mode to show images on screen?')) {
      renderPresentation(state.currentEvent.id);
    } else {
      renderPresentation(state.currentEvent.id);
    }
  } catch (error) {
    alert('Error starting vote: ' + error.message);
  }
}

function renderPresentation(eventId) {
  state.currentView = 'presentation';
  state.presentationEventId = eventId;
  render();
  startPresentationPolling(eventId);
}

function startPresentationPolling(eventId) {
  if (state.presentationInterval) clearInterval(state.presentationInterval);
  
  state.presentationInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/events/${eventId}/presentation`);
      if (!response.ok) return;
      
      const data = await response.json();
      state.presentationData = data;
      render();
      
      if (data.event.status === 'closed') {
        clearInterval(state.presentationInterval);
      }
    } catch (error) {
      console.error('Presentation polling error:', error);
    }
  }, 1000);
}

function renderPresentationView() {
  if (!state.presentationData) {
    return '<div class="container"><div class="card"><div class="loading">Loading presentation...</div></div></div>';
  }
  
  const { event, currentImage, currentImageIndex, totalImages, participantCount, votesOnCurrentImage, allVoted } = state.presentationData;
  
  if (!currentImage) {
    return `
      <div class="container">
        <div class="card" style="text-align: center; padding: 40px;">
          <h2>No images uploaded yet</h2>
        </div>
      </div>
    `;
  }
  
  const progress = ((currentImageIndex + 1) / totalImages * 100).toFixed(0);
  const isLastImage = currentImageIndex >= totalImages - 1;
  
  return `
    <div class="container">
      <div class="header">
        <h1>${event.name}</h1>
      </div>
      
      <div class="card" style="margin-bottom: 20px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: 600;">Image ${currentImageIndex + 1} of ${totalImages}</span>
          <span style="color: #667eea; font-weight: 600;">${progress}%</span>
        </div>
        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 8px;">
          <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem; color: #666;">
          <span>👥 ${participantCount} participant${participantCount !== 1 ? 's' : ''}</span>
          <span style="font-weight: 600; color: ${allVoted ? '#28a745' : '#667eea'};">${votesOnCurrentImage} / ${participantCount} voted</span>
        </div>
      </div>
      
      <div class="card" style="text-align: center; padding: 20px;">
        <img src="${currentImage.url}" alt="${currentImage.filename}" 
             style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); background: #f8f9fa; padding: 20px;">
      </div>
      
      ${allVoted ? `
      <div class="card" style="background: #28a745; color: white; text-align: center; padding: 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0;">✅ All participants have voted!</h2>
        <button class="btn" onclick="advanceToNextImage('${event.id}')" style="background: white; color: #28a745; border: none; margin-top: 10px; font-size: 1.1rem; padding: 12px 24px;">
          ${isLastImage ? 'Show Leaderboard' : 'Next Image →'}
        </button>
      </div>
      ` : `
      <div class="card" style="background: #ffc107; color: #000; text-align: center; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 600;">⏳ Waiting for all participants to vote...</p>
        <p style="margin: 5px 0 0 0;">${votesOnCurrentImage} / ${participantCount} have voted</p>
      </div>
      `}
    </div>
  `;
}

async function advanceToNextImage(eventId) {
  try {
    const response = await fetch(`${API_BASE}/api/events/${eventId}/next-image`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.isComplete) {
      showLeaderboard();
    } else {
      const presResponse = await fetch(`${API_BASE}/api/events/${eventId}/presentation`);
      state.presentationData = await presResponse.json();
      render();
    }
  } catch (error) {
    alert('Error advancing to next image: ' + error.message);
  }
}

window.advanceToNextImage = advanceToNextImage;

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

  if (state.currentEvent.status === 'draft') {
    return `
      <div class="container">
        <div class="card" style="text-align: center; padding: 40px;">
          <h2>⏳ Waiting for Event to Start</h2>
          <p style="color: #666; margin: 20px 0;">The admin will start the event soon.</p>
          <p style="color: #666;">👥 ${state.currentEvent.participantCount || 0} participant${state.currentEvent.participantCount !== 1 ? 's' : ''} joined</p>
        </div>
      </div>
    `;
  }

  if (state.currentEvent.status === 'closed') {
    return `
      <div class="container">
        <div class="card" style="text-align: center; padding: 40px;">
          <h2>✅ Voting Complete!</h2>
          <p style="color: #666; margin: 20px 0;">Thank you for participating!</p>
          <button class="btn" onclick="showLeaderboard()">View Leaderboard</button>
        </div>
      </div>
    `;
  }

  const currentImage = state.currentEvent.currentImage || state.images[state.currentImageIndex];
  if (!currentImage) {
    return `
      <div class="container">
        <div class="card">
          <div class="loading">Loading current image...</div>
        </div>
      </div>
    `;
  }

  const participantCount = state.currentEvent.participantCount || 0;
  const votesOnCurrent = state.currentEvent.votesOnCurrentImage || 0;
  const hasVoted = state.votedImages && state.votedImages.includes(currentImage.id);

  return `
    <div class="container">
      <div class="header">
        <h1>${state.currentEvent.name}</h1>
      </div>
      
      <div class="card" style="margin-bottom: 20px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: 600;">Image ${state.currentImageIndex + 1} of ${state.images.length}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem; color: #666;">
          <span>👥 ${participantCount} participant${participantCount !== 1 ? 's' : ''}</span>
          <span>${votesOnCurrent} / ${participantCount} voted on this image</span>
        </div>
      </div>
      
      ${hasVoted ? `
      <div class="card" style="background: #28a745; color: white; margin-bottom: 20px; text-align: center; padding: 15px;">
        <p style="margin: 0; font-weight: 600;">✓ You've voted! Waiting for others...</p>
        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">${votesOnCurrent} / ${participantCount} participants have voted</p>
      </div>
      ` : ''}

      <div class="card voting-interface">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h2 style="margin: 0 0 10px 0; color: #333;">Rate the image shown on screen</h2>
          <p style="color: #666; margin: 0;">Look at the image displayed on the main screen and rate it below</p>
        </div>

        <div style="margin: 30px 0;">
          <div style="text-align: center; margin-bottom: 15px; font-weight: 600; color: #333;">Rate this image:</div>
          <div class="star-rating" id="star-rating">
            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-stars="${i}" title="${i} star${i > 1 ? 's' : ''}">⭐</span>`).join('')}
          </div>
          <div id="star-feedback" style="text-align: center; margin-top: 10px; min-height: 20px; color: #667eea; font-weight: 600;"></div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
          ${!hasVoted ? `
          <button class="btn btn-success" onclick="submitVote()" style="min-width: 200px; font-size: 1.2rem; padding: 15px 30px;">
            Submit Vote
          </button>
          ` : `
          <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; min-width: 200px;">
            <div style="font-size: 1.2rem; font-weight: 600; color: #28a745;">✓ Vote Submitted</div>
            <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">Waiting for others...</div>
          </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function setupStarRating() {
  const stars = document.querySelectorAll('.star');
  let selectedStars = 0;
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedStars = parseInt(star.getAttribute('data-stars'));
      updateStarDisplay(selectedStars);
    });
    
    star.addEventListener('mouseenter', () => {
      const hoverStars = parseInt(star.getAttribute('data-stars'));
      highlightStars(hoverStars);
    });
  });
  
  document.querySelector('.star-rating')?.addEventListener('mouseleave', () => {
    highlightStars(selectedStars);
  });
  
  function highlightStars(count) {
    stars.forEach((star, index) => {
      if (index < count) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }
  
  function updateStarDisplay(count) {
    selectedStars = count;
    highlightStars(count);
    const feedback = document.getElementById('star-feedback');
    if (feedback) {
      feedback.textContent = `${count} star${count > 1 ? 's' : ''} selected`;
    }
  }
  
  window.submitVote = async function() {
    if (selectedStars === 0) {
      alert('Please select a rating');
      return;
    }
    
    const currentImage = state.currentEvent.currentImage || state.images[state.currentImageIndex];
    if (!currentImage) return;
    
    const submitBtn = document.querySelector('.btn-success');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: state.currentEvent.id,
          imageId: currentImage.id,
          voterId: getVoterId(),
          stars: selectedStars,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit vote');
      }
      
      if (!state.votedImages) state.votedImages = [];
      if (!state.votedImages.includes(currentImage.id)) {
        state.votedImages.push(currentImage.id);
        localStorage.setItem('votedImages', JSON.stringify(state.votedImages));
      }
      
      if (submitBtn) {
        submitBtn.textContent = '✓ Voted!';
        submitBtn.style.background = '#28a745';
      }
      
      const fullEventResponse = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}?voter_id=${getVoterId()}`);
      const fullEvent = await fullEventResponse.json();
      state.currentEvent = fullEvent;
      render();
      setupStarRating();
    } catch (error) {
      alert('Error submitting vote: ' + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  };
}

async function showLeaderboard() {
  if (!state.currentEvent) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}/leaderboard`);
    const data = await response.json();
    
    state.leaderboardData = data;
    state.currentView = 'leaderboard';
    render();
  } catch (error) {
    alert('Error loading leaderboard: ' + error.message);
  }
}

function renderLeaderboard() {
  if (!state.leaderboardData) {
    return '<div class="container"><div class="card"><div class="loading">Loading leaderboard...</div></div></div>';
  }
  
  const { leaderboard, participantCount } = state.leaderboardData;
  
  return `
    <div class="container">
      <div class="header">
        <h1>🏆 Leaderboard</h1>
        <p style="color: rgba(255,255,255,0.9);">${participantCount} participant${participantCount !== 1 ? 's' : ''} voted</p>
      </div>
      
      <div class="card">
        <div style="display: grid; gap: 20px;">
          ${leaderboard.map((item, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            return `
              <div style="display: flex; gap: 20px; align-items: center; padding: 20px; background: ${rank <= 3 ? '#f8f9fa' : 'white'}; border-radius: 8px; border: ${rank <= 3 ? '2px solid #667eea' : '1px solid #e0e0e0'};">
                <div style="font-size: 2rem; font-weight: 600; min-width: 60px; text-align: center;">${medal}</div>
                <img src="${item.url}" alt="${item.filename}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">
                <div style="flex: 1;">
                  <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 10px;">${item.filename}</div>
                  <div style="display: flex; gap: 20px; color: #666;">
                    <div>⭐ ${parseFloat(item.avg_stars).toFixed(1)}</div>
                    <div>👥 ${item.vote_count} votes</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function uploadImagesForEvent(eventId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 100 * 1024 * 1024) {
        alert(`File "${file.name}" is too large (max 100MB). Skipping.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        alert(`File "${file.name}" is not an image. Skipping.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      alert('No valid images to upload.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of validFiles) {
      let fileToUpload = file;
      
      if (file.size > 2 * 1024 * 1024) {
        try {
          fileToUpload = await compressImage(file, 1920, 1920, 0.85, 3);
        } catch (error) {
          errorCount++;
          continue;
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
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

    if (successCount > 0) {
      alert(`${successCount} image${successCount !== 1 ? 's' : ''} uploaded successfully!`);
      startParticipantPolling();
    }
    if (errorCount > 0) {
      alert(`${errorCount} image${errorCount !== 1 ? 's' : ''} failed to upload.`);
    }
  };
  input.click();
}

function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85, maxSizeMB = 3) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const sizeMB = blob.size / 1024 / 1024;
            if (sizeMB > maxSizeMB && currentQuality > 0.3) {
              currentQuality -= 0.1;
              canvas.toBlob((newBlob) => {
                if (newBlob) {
                  resolve(new File([newBlob], file.name, { type: 'image/jpeg' }));
                } else {
                  resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }
              }, 'image/jpeg', currentQuality);
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }
          }, 'image/jpeg', currentQuality);
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
