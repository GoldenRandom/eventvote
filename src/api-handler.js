// Shared API handler for both Workers and Pages Functions

export async function handleAPI(request, env, path, method, corsHeaders) {
  const url = new URL(request.url);

  // Create event
  if (path === '/api/events' && method === 'POST') {
    try {
      // Check if DB binding exists
      if (!env.DB) {
        return new Response(
          JSON.stringify({ 
            error: 'Database not configured. Please configure D1 binding in Cloudflare Pages settings.',
            details: 'Go to Settings → Functions → D1 database bindings → Add: DB → voting-db'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const body = await request.json();
      
      if (!body.name || !body.name.trim()) {
        return new Response(
          JSON.stringify({ error: 'Event name is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const eventId = crypto.randomUUID();
      // Generate 5-digit QR code (10000-99999)
      const qrCode = String(Math.floor(10000 + Math.random() * 90000));
      const timestamp = Date.now();

      const result = await env.DB.prepare(
        'INSERT INTO events (id, name, status, created_at, qr_code) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(eventId, body.name.trim(), 'draft', timestamp, qrCode)
        .run();

      if (!result.success) {
        throw new Error('Database insert failed');
      }

      return new Response(
        JSON.stringify({ id: eventId, qr_code: qrCode, name: body.name }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create event',
          details: error.message,
          hint: error.message.includes('DB') ? 'Database binding may not be configured. Check Cloudflare Pages settings.' : ''
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Get event by QR code
  if (path.startsWith('/api/events/qr/') && method === 'GET') {
    const qrCode = path.split('/api/events/qr/')[1];
    const event = await env.DB.prepare(
      'SELECT * FROM events WHERE qr_code = ?'
    ).bind(qrCode).first();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Register participant join (if voter_id provided)
    const url = new URL(request.url);
    const voterId = url.searchParams.get('voter_id');
    
    if (voterId) {
      try {
        // Check if already registered
        const existing = await env.DB.prepare(
          'SELECT * FROM participants WHERE event_id = ? AND voter_id = ?'
        ).bind(event.id, voterId).first();
        
        if (!existing) {
          const participantId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO participants (id, event_id, voter_id, joined_at) VALUES (?, ?, ?, ?)'
          ).bind(participantId, event.id, voterId, Date.now()).run();
        }
      } catch (error) {
        // Ignore errors (participant might already exist)
        console.error('Error registering participant:', error);
      }
    }

    return new Response(JSON.stringify(event), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get event by ID
  if (path.startsWith('/api/events/') && method === 'GET') {
    const eventId = path.split('/api/events/')[1];
    const event = await env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get images for this event
    const images = await env.DB.prepare(
      'SELECT * FROM images WHERE event_id = ? ORDER BY uploaded_at ASC'
    ).bind(eventId).all();

    // Get vote statistics
    const voteStats = await env.DB.prepare(
      `SELECT image_id, AVG(stars) as avg_stars, COUNT(*) as vote_count 
       FROM votes WHERE event_id = ? GROUP BY image_id`
    ).bind(eventId).all();

    // Get participant count (people who joined, not just voted)
    const participantCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
    ).bind(eventId).first();

    // Get current image index
    const currentImageIndex = event.current_image_index || 0;
    const currentImage = images.results && images.results[currentImageIndex] ? images.results[currentImageIndex] : null;

    // Check if all participants have voted on current image
    let allVoted = false;
    let votesOnCurrentImage = 0;
    if (currentImage && participantCount?.count > 0) {
      const votesOnImage = await env.DB.prepare(
        `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ? AND image_id = ?`
      ).bind(eventId, currentImage.id).first();
      votesOnCurrentImage = votesOnImage?.count || 0;
      allVoted = votesOnCurrentImage >= participantCount.count;
    }
    
    // Also register participant if voter_id provided
    const url = new URL(request.url);
    const voterId = url.searchParams.get('voter_id');
    if (voterId) {
      try {
        const existing = await env.DB.prepare(
          'SELECT * FROM participants WHERE event_id = ? AND voter_id = ?'
        ).bind(eventId, voterId).first();
        
        if (!existing) {
          const participantId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO participants (id, event_id, voter_id, joined_at) VALUES (?, ?, ?, ?)'
          ).bind(participantId, eventId, voterId, Date.now()).run();
          // Update count
          const newCount = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
          ).bind(eventId).first();
          participantCount.count = newCount?.count || participantCount.count;
        }
      } catch (error) {
        console.error('Error registering participant:', error);
      }
    }

    return new Response(
      JSON.stringify({
        ...event,
        images: images.results || [],
        voteStats: voteStats.results || [],
        participantCount: participantCount?.count || 0,
        currentImageIndex: currentImageIndex,
        currentImage: currentImage,
        allVotedOnCurrent: allVoted,
        votesOnCurrentImage: votesOnCurrentImage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Get presentation view (admin view)
  if (path.startsWith('/api/events/') && path.endsWith('/presentation') && method === 'GET') {
    const eventId = path.split('/api/events/')[1].replace('/presentation', '');
    const event = await env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const images = await env.DB.prepare(
      'SELECT * FROM images WHERE event_id = ? ORDER BY uploaded_at ASC'
    ).bind(eventId).all();

    const participantCount = await env.DB.prepare(
      `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ?`
    ).bind(eventId).first();

    const currentImageIndex = event.current_image_index || 0;
    const currentImage = images.results && images.results[currentImageIndex] ? images.results[currentImageIndex] : null;

    // Check votes on current image
    let votesOnCurrentImage = 0;
    let allVoted = false;
    if (currentImage && participantCount?.count > 0) {
      const votesOnImage = await env.DB.prepare(
        `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ? AND image_id = ?`
      ).bind(eventId, currentImage.id).first();
      votesOnCurrentImage = votesOnImage?.count || 0;
      allVoted = votesOnCurrentImage >= participantCount.count;
    }

    return new Response(
      JSON.stringify({
        event: event,
        currentImage: currentImage,
        currentImageIndex: currentImageIndex,
        totalImages: images.results?.length || 0,
        participantCount: participantCount?.count || 0,
        votesOnCurrentImage: votesOnCurrentImage,
        allVoted: allVoted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Advance to next image (admin action)
  if (path.startsWith('/api/events/') && path.endsWith('/next-image') && method === 'POST') {
    const eventId = path.split('/api/events/')[1].replace('/next-image', '');
    
    const event = await env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const images = await env.DB.prepare(
      'SELECT * FROM images WHERE event_id = ? ORDER BY uploaded_at ASC'
    ).bind(eventId).all();

    const currentIndex = event.current_image_index || 0;
    const nextIndex = currentIndex + 1;
    const totalImages = images.results?.length || 0;

    if (nextIndex >= totalImages) {
      // End of voting - show leaderboard
      await env.DB.prepare(
        'UPDATE events SET status = ? WHERE id = ?'
      ).bind('closed', eventId).run();
    } else {
      // Move to next image
      await env.DB.prepare(
        'UPDATE events SET current_image_index = ? WHERE id = ?'
      ).bind(nextIndex, eventId).run();
    }

    return new Response(
      JSON.stringify({ success: true, nextIndex, isComplete: nextIndex >= totalImages }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Get leaderboard for event
  if (path.startsWith('/api/events/') && path.endsWith('/leaderboard') && method === 'GET') {
    const eventId = path.split('/api/events/')[1].replace('/leaderboard', '');

    // Get all images with their stats, ordered by average rating
    const leaderboard = await env.DB.prepare(
      `SELECT 
        i.id, i.url, i.filename, i.uploaded_at,
        COALESCE(AVG(v.stars), 0) as avg_stars,
        COUNT(v.id) as vote_count
       FROM images i
       LEFT JOIN votes v ON i.id = v.image_id
       WHERE i.event_id = ?
       GROUP BY i.id
       ORDER BY avg_stars DESC, vote_count DESC`
    ).bind(eventId).all();

    // Get participant count
    const participantCount = await env.DB.prepare(
      `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ?`
    ).bind(eventId).first();

    return new Response(
      JSON.stringify({
        leaderboard: leaderboard.results || [],
        participantCount: participantCount?.count || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Update event status
  if (path.startsWith('/api/events/') && path.endsWith('/status') && method === 'PUT') {
    const eventId = path.split('/api/events/')[1].replace('/status', '');
    const body = await request.json();

    await env.DB.prepare(
      'UPDATE events SET status = ? WHERE id = ?'
    ).bind(body.status, eventId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Upload image
  if (path === '/api/images' && method === 'POST') {
    try {
      // Check if DB binding exists
      if (!env.DB) {
        return new Response(
          JSON.stringify({ 
            error: 'Database not configured',
            details: 'Please configure D1 binding in Cloudflare Pages settings'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const formData = await request.formData();
      const eventId = formData.get('eventId');
      const file = formData.get('file');

      if (!file || !eventId) {
        return new Response(
          JSON.stringify({ error: 'Missing file or eventId' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check file size (limit to 100MB)
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({ 
            error: 'File too large',
            details: `Maximum file size is 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type', details: 'Only image files are allowed' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const imageId = crypto.randomUUID();
      const timestamp = Date.now();
      const filename = file.name;

      // Convert file to base64 for storage
      // Use a more efficient method for large files
      let arrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }

      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid memory issues
      let base64 = '';
      const chunkSize = 8192;
      try {
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          base64 += String.fromCharCode.apply(null, chunk);
        }
        base64 = btoa(base64);
      } catch (error) {
        throw new Error(`Failed to encode image: ${error.message}. File may be corrupted.`);
      }
      
      // Check if base64 string is too large (D1 has limits - max ~5MB base64 = ~3.75MB original)
      // Be conservative to avoid SQLITE_TOOBIG errors
      if (base64.length > 5 * 1024 * 1024) { // ~5MB base64 string (safe limit for D1)
        throw new Error(`Image is too large after encoding (${(base64.length / 1024 / 1024).toFixed(2)}MB). Maximum safe size is ~3.75MB. The image will be automatically compressed on upload.`);
      }
      
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Insert into database
      let result;
      try {
        result = await env.DB.prepare(
          'INSERT INTO images (id, event_id, url, filename, uploaded_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(imageId, eventId, dataUrl, filename, timestamp)
          .run();
      } catch (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!result.success) {
        throw new Error(`Database insert failed: ${result.error || 'Unknown error'}`);
      }

      return new Response(
        JSON.stringify({
          id: imageId,
          url: dataUrl,
          filename,
          event_id: eventId,
          size: file.size,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Image upload error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload image',
          details: error.message || 'Unknown error occurred'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Submit vote
  if (path === '/api/votes' && method === 'POST') {
    const body = await request.json();
    const voteId = crypto.randomUUID();
    const timestamp = Date.now();

    // Generate or use provided voter_id
    const voterId = body.voter_id || `voter_${crypto.randomUUID()}`;

    // Check if vote already exists
    const existing = await env.DB.prepare(
      'SELECT * FROM votes WHERE event_id = ? AND image_id = ? AND voter_id = ?'
    )
      .bind(body.event_id, body.image_id, voterId)
      .first();

    if (existing) {
      // Update existing vote
      await env.DB.prepare(
        'UPDATE votes SET stars = ?, created_at = ? WHERE id = ?'
      ).bind(body.stars, timestamp, existing.id).run();

      return new Response(
        JSON.stringify({ id: existing.id, updated: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new vote
    await env.DB.prepare(
      'INSERT INTO votes (id, event_id, image_id, voter_id, stars, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(voteId, body.event_id, body.image_id, voterId, body.stars, timestamp)
      .run();

    return new Response(
      JSON.stringify({ id: voteId, voter_id: voterId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Get votes for an image
  if (path.startsWith('/api/images/') && path.endsWith('/votes') && method === 'GET') {
    const imageId = path.split('/api/images/')[1].replace('/votes', '');
    const votes = await env.DB.prepare(
      'SELECT * FROM votes WHERE image_id = ? ORDER BY created_at DESC'
    ).bind(imageId).all();

    const stats = await env.DB.prepare(
      'SELECT AVG(stars) as avg_stars, COUNT(*) as vote_count FROM votes WHERE image_id = ?'
    ).bind(imageId).first();

    return new Response(
      JSON.stringify({
        votes: votes.results || [],
        stats: stats || { avg_stars: 0, vote_count: 0 },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

