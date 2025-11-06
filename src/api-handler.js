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
      const qrCode = crypto.randomUUID();
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

    return new Response(
      JSON.stringify({
        ...event,
        images: images.results || [],
        voteStats: voteStats.results || [],
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
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid memory issues
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, chunk);
      }
      base64 = btoa(base64);
      
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Insert into database
      const result = await env.DB.prepare(
        'INSERT INTO images (id, event_id, url, filename, uploaded_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(imageId, eventId, dataUrl, filename, timestamp)
        .run();

      if (!result.success) {
        throw new Error('Database insert failed');
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
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload image',
          details: error.message
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

