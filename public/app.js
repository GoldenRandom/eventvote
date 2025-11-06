const API_BASE = window.location.origin;

// State management
let state = {
  currentView: 'home',
  currentEvent: null,
  images: [],
  currentImageIndex: 0,
  voterId: localStorage.getItem('voterId') || null,
  votedImages: JSON.parse(localStorage.getItem('votedImages') || '[]'), // Track which images user has voted on
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
    
    // Show welcome message with participant count
    if (fullEvent.participantCount > 0) {
      setTimeout(() => {
        alert(`Welcome! ${fullEvent.participantCount} participant${fullEvent.participantCount !== 1 ? 's' : ''} ${fullEvent.participantCount === 1 ? 'has' : 'have'} joined this event.`);
      }, 500);
    }
    
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
  const progress = ((state.currentImageIndex + 1) / state.images.length * 100).toFixed(0);
  const participantCount = state.currentEvent.participantCount || 0;
  
  // Check if user has voted on this image
  const hasVoted = state.votedImages && state.votedImages.includes(currentImage.id);
  
  // Check if user has voted on all images
  const allVoted = state.votedImages && state.votedImages.length === state.images.length;

  return `
    <div class="container">
      <div class="header">
        <h1>${state.currentEvent.name}</h1>
        <span class="status-badge status-${state.currentEvent.status}">${state.currentEvent.status}</span>
      </div>
      
      <!-- Progress Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: 600;">Progress</span>
          <span style="color: #667eea; font-weight: 600;">${state.currentImageIndex + 1} / ${state.images.length}</span>
        </div>
        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 8px;">
          <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem; color: #666;">
          <span>👥 ${participantCount} participant${participantCount !== 1 ? 's' : ''}</span>
          <span>${state.votedImages ? state.votedImages.length : 0} / ${state.images.length} voted</span>
        </div>
      </div>
      
      ${allVoted ? `
      <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 20px; text-align: center; padding: 20px;">
        <h2 style="margin: 0 0 10px 0;">🎉 You've voted on all images!</h2>
        <p style="margin: 0;">View the leaderboard to see the results</p>
        <button class="btn" onclick="showLeaderboard()" style="margin-top: 15px; background: white; color: #667eea; border: none;">
          View Leaderboard
        </button>
      </div>
      ` : ''}

      <div class="card voting-interface">
        <!-- Image Stats -->
        <div class="stats" style="margin-bottom: 20px;">
          <div class="stat-item">
            <div class="stat-value" style="font-size: 1.5rem;">⭐ ${stats.avg_stars ? stats.avg_stars.toFixed(1) : '0.0'}</div>
            <div class="stat-label">Average Rating</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="font-size: 1.5rem;">👥 ${stats.vote_count || 0}</div>
            <div class="stat-label">Total Votes</div>
          </div>
          ${hasVoted ? `
          <div class="stat-item">
            <div class="stat-value" style="font-size: 1.5rem; color: #28a745;">✓</div>
            <div class="stat-label">You Voted</div>
          </div>
          ` : ''}
        </div>

        <!-- Image Display -->
        <div style="position: relative; margin: 20px 0;">
          <img src="${currentImage.url}" alt="${currentImage.filename}" class="voting-image" id="voting-image" 
               style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); background: #f8f9fa; padding: 10px;">
          ${hasVoted ? `
          <div style="position: absolute; top: 10px; right: 10px; background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">
            ✓ Voted
          </div>
          ` : ''}
        </div>

        <!-- Star Rating -->
        <div style="margin: 30px 0;">
          <div style="text-align: center; margin-bottom: 15px; font-weight: 600; color: #333;">Rate this image:</div>
          <div class="star-rating" id="star-rating">
            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-stars="${i}" title="${i} star${i > 1 ? 's' : ''}">⭐</span>`).join('')}
          </div>
          <div id="star-feedback" style="text-align: center; margin-top: 10px; min-height: 20px; color: #667eea; font-weight: 600;"></div>
        </div>

        <!-- Navigation -->
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
          <button class="btn" ${state.currentImageIndex === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} 
                  onclick="previousImage()" style="min-width: 120px;">
            ← Previous
          </button>
          <button class="btn btn-success" onclick="submitVote()" style="min-width: 150px; font-size: 1.1rem; padding: 12px 24px;">
            ${hasVoted ? 'Update Vote' : 'Submit Vote'}
          </button>
          <button class="btn" ${state.currentImageIndex === state.images.length - 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} 
                  onclick="nextImage()" style="min-width: 120px;">
            Next →
          </button>
        </div>

        <!-- Image Navigation Dots -->
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 30px; flex-wrap: wrap;">
          ${state.images.map((img, idx) => {
            const imgStats = voteStats.find(s => s.image_id === img.id);
            const voted = state.votedImages && state.votedImages.includes(img.id);
            return `
              <button onclick="goToImage(${idx})" 
                      style="width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${idx === state.currentImageIndex ? '#667eea' : '#ddd'}; 
                             background: ${voted ? '#28a745' : (idx === state.currentImageIndex ? '#667eea' : 'transparent')}; 
                             cursor: pointer; transition: all 0.2s;"
                      title="Image ${idx + 1}${voted ? ' (Voted)' : ''}">
              </button>
            `;
          }).join('')}
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

// Compress image before upload
function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85, maxSizeMB = 3) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
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

        // Draw and compress
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels if still too large
        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const sizeMB = blob.size / 1024 / 1024;
            if (sizeMB > maxSizeMB && currentQuality > 0.3) {
              // Reduce quality and try again
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

function uploadImageForEvent(eventId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter files by size (100MB limit before compression)
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

    // Create upload progress modal
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
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'card';
    progressContainer.style.cssText = 'min-width: 400px; text-align: center;';
    progressContainer.innerHTML = `
      <h2>Uploading Images</h2>
      <div id="upload-progress" style="margin: 20px 0;">
        <div class="loading">Preparing upload...</div>
      </div>
      <div id="upload-stats" style="margin-top: 20px; color: #666;"></div>
    `;
    modal.appendChild(progressContainer);
    document.body.appendChild(modal);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Upload files one by one with progress
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const progress = ((i + 1) / validFiles.length * 100).toFixed(0);
      
      document.getElementById('upload-progress').innerHTML = `
        <div style="margin-bottom: 10px;">Processing ${i + 1} of ${validFiles.length}</div>
        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 20px;">
          <div style="background: #667eea; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
        </div>
        <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">${file.name}</div>
        <div style="margin-top: 5px; font-size: 0.85rem; color: #999;">Compressing image...</div>
      `;

      let fileToUpload = file;
      
      // Compress image if it's large (over 2MB)
      if (file.size > 2 * 1024 * 1024) {
        try {
          fileToUpload = await compressImage(file, 1920, 1920, 0.85, 3);
          const originalSize = (file.size / 1024 / 1024).toFixed(2);
          const compressedSize = (fileToUpload.size / 1024 / 1024).toFixed(2);
          console.log(`Compressed ${file.name}: ${originalSize}MB → ${compressedSize}MB`);
        } catch (error) {
          errors.push(`${file.name}: Compression failed - ${error.message}`);
          errorCount++;
          continue;
        }
      }

      document.getElementById('upload-progress').innerHTML = `
        <div style="margin-bottom: 10px;">Uploading ${i + 1} of ${validFiles.length}</div>
        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; height: 20px;">
          <div style="background: #667eea; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
        </div>
        <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">${file.name}</div>
      `;

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
          const errorData = await response.json().catch(() => ({}));
          errorCount++;
          const errorMsg = errorData.error || 'Upload failed';
          const errorDetails = errorData.details ? ` - ${errorData.details}` : '';
          errors.push(`${file.name}: ${errorMsg}${errorDetails}`);
        }
      } catch (error) {
        errorCount++;
        let errorMsg = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMsg = 'Network error - check your connection';
        } else if (error.message.includes('timeout')) {
          errorMsg = 'Upload timeout - file may be too large';
        }
        errors.push(`${file.name}: ${errorMsg}`);
      }
    }

    // Show results
    document.getElementById('upload-progress').innerHTML = `
      <div style="font-size: 2rem; margin: 20px 0;">${successCount > 0 ? '✅' : '❌'}</div>
      <div style="font-size: 1.2rem; margin-bottom: 10px;">
        ${successCount} successful, ${errorCount} failed
      </div>
    `;

    let statsHtml = '';
    if (errors.length > 0) {
      statsHtml = `<div style="margin-top: 20px; color: #dc3545; text-align: left; max-height: 200px; overflow-y: auto;">
        <strong>Errors:</strong><br>
        ${errors.map(e => `• ${e}`).join('<br>')}
      </div>`;
    }
    document.getElementById('upload-stats').innerHTML = statsHtml;

    // Show results and start button
    if (errorCount === 0 && successCount > 0) {
      // Add Start Event button
      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-success';
      startBtn.textContent = 'Start Event';
      startBtn.style.marginTop = '20px';
      startBtn.onclick = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/events/${eventId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' }),
          });
          if (response.ok) {
            modal.remove();
            alert('Event started! Participants can now join and vote.');
            state.currentView = 'admin';
            render();
            loadEvents();
          } else {
            alert('Failed to start event');
          }
        } catch (error) {
          alert('Error starting event: ' + error.message);
        }
      };
      progressContainer.appendChild(startBtn);
      
      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-secondary';
      closeBtn.textContent = 'Close';
      closeBtn.style.marginTop = '10px';
      closeBtn.onclick = () => modal.remove();
      progressContainer.appendChild(closeBtn);
    } else {
      // Add close button if there are errors
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn';
      closeBtn.textContent = 'Close';
      closeBtn.style.marginTop = '20px';
      closeBtn.onclick = () => modal.remove();
      progressContainer.appendChild(closeBtn);
    }
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
    alert('Please select a rating by clicking on the stars');
    return;
  }

  const currentImage = state.images[state.currentImageIndex];
  const submitBtn = document.querySelector('.btn-success');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to submit vote');
    }

    const result = await response.json();
    if (result.voter_id) {
      state.voterId = result.voter_id;
      localStorage.setItem('voterId', result.voter_id);
    }
    
    // Mark image as voted
    if (!state.votedImages) {
      state.votedImages = [];
    }
    if (!state.votedImages.includes(currentImage.id)) {
      state.votedImages.push(currentImage.id);
      localStorage.setItem('votedImages', JSON.stringify(state.votedImages));
    }
    
    // Show success feedback
    submitBtn.textContent = '✓ Voted!';
    submitBtn.style.background = '#28a745';
    
    // Refresh stats
    const fullEventResponse = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}`);
    const fullEvent = await fullEventResponse.json();
    state.currentEvent = fullEvent;
    
    // Refresh event data to get updated participant count
    try {
      const fullEventResponse = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}`);
      const fullEvent = await fullEventResponse.json();
      state.currentEvent = fullEvent;
    } catch (e) {
      console.error('Failed to refresh event data:', e);
    }
    
    // Auto-advance after 1 second
    setTimeout(() => {
      if (state.currentImageIndex < state.images.length - 1) {
        nextImage();
      } else {
        // Check if all images are voted
        const allVoted = state.votedImages && state.votedImages.length === state.images.length;
        if (allVoted) {
          // Show leaderboard option
          render();
          setupStarRating();
        } else {
          render();
          setupStarRating();
        }
      }
    }, 1000);
  } catch (error) {
    alert('Error submitting vote: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
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
    const feedback = document.getElementById('star-feedback');
    
    stars.forEach((star) => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-stars'));
        stars.forEach((s, i) => {
          if (i < rating) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
        
        // Show feedback
        if (feedback) {
          const messages = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
          feedback.textContent = messages[rating] || '';
        }
      });
      
      star.addEventListener('mouseenter', () => {
        const rating = parseInt(star.getAttribute('data-stars'));
        stars.forEach((s, i) => {
          if (i < rating) {
            s.style.transform = 'scale(1.2)';
            s.style.transition = 'transform 0.2s';
          }
        });
      });
      
      star.addEventListener('mouseleave', () => {
        stars.forEach((s) => {
          s.style.transform = '';
        });
      });
    });
  }, 100);
}

function goToImage(index) {
  if (index >= 0 && index < state.images.length) {
    state.currentImageIndex = index;
    render();
    setupStarRating();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

window.goToImage = goToImage;

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
async function showLeaderboard() {
  if (!state.currentEvent) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/events/${state.currentEvent.id}/leaderboard`);
    if (!response.ok) {
      throw new Error('Failed to load leaderboard');
    }
    
    const data = await response.json();
    const leaderboard = data.leaderboard || [];
    const participantCount = data.participantCount || 0;
    
    state.currentView = 'leaderboard';
    state.leaderboardData = { leaderboard, participantCount };
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
        <p style="color: white; margin-top: 10px;">${state.currentEvent.name}</p>
      </div>
      
      <div class="card" style="margin-bottom: 20px; text-align: center; padding: 20px;">
        <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
          <div class="stat-item">
            <div class="stat-value" style="font-size: 2rem;">👥 ${participantCount}</div>
            <div class="stat-label">Total Participants</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="font-size: 2rem;">📸 ${leaderboard.length}</div>
            <div class="stat-label">Images</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2 style="text-align: center; margin-bottom: 20px;">Top Rated Images</h2>
        ${leaderboard.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: #666;">
            <p>No votes yet. Be the first to vote!</p>
            <button class="btn" onclick="state.currentView='voting'; render(); setupStarRating();">Start Voting</button>
          </div>
        ` : `
          <div style="display: grid; gap: 20px;">
            ${leaderboard.map((item, index) => {
              const rank = index + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
              return `
                <div style="display: flex; align-items: center; gap: 20px; padding: 20px; border: 2px solid ${rank <= 3 ? '#667eea' : '#e0e0e0'}; border-radius: 12px; background: ${rank <= 3 ? '#f8f9ff' : 'white'};">
                  <div style="font-size: 2rem; font-weight: bold; min-width: 60px; text-align: center;">
                    ${medal}
                  </div>
                  <img src="${item.url}" alt="${item.filename}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0;">${item.filename}</h3>
                    <div style="display: flex; gap: 20px; margin-top: 10px;">
                      <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">⭐ ${parseFloat(item.avg_stars).toFixed(1)}</div>
                        <div style="font-size: 0.9rem; color: #666;">Average Rating</div>
                      </div>
                      <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">👥 ${item.vote_count}</div>
                        <div style="font-size: 0.9rem; color: #666;">Total Votes</div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
        
        <div style="margin-top: 30px; text-align: center;">
          <button class="btn" onclick="state.currentView='voting'; render(); setupStarRating();">Back to Voting</button>
          <button class="btn btn-secondary" onclick="state.currentView='home'; render();">Home</button>
        </div>
      </div>
    </div>
  `;
}

window.previousImage = previousImage;
window.nextImage = nextImage;
window.submitVote = submitVote;
window.joinEvent = joinEvent;
window.showLeaderboard = showLeaderboard;


