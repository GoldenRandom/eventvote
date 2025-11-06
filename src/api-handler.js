export async function handleAPI(request, env, path, method, corsHeaders) {
  const url = new URL(request.url);

  // Create event
  if (path === '/api/events' && method === 'POST') {
    try {
      if (!env.DB) {
        return new Response(JSON.stringify({ 
          error: 'Database not configured',
          details: 'Configure D1 binding in Cloudflare Pages settings'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await request.json();
      if (!body.name || !body.name.trim()) {
        return new Response(JSON.stringify({ error: 'Event name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const eventId = crypto.randomUUID();
      const qrCode = String(Math.floor(10000 + Math.random() * 90000));
      const timestamp = Date.now();

      const result = await env.DB.prepare(
        'INSERT INTO events (id, name, status, created_at, qr_code) VALUES (?, ?, ?, ?, ?)'
      ).bind(eventId, body.name.trim(), 'draft', timestamp, qrCode).run();

      if (!result.success) {
        throw new Error('Database insert failed');
      }

      return new Response(JSON.stringify({ id: eventId, qr_code: qrCode, name: body.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create event', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Get event by QR code
  if (path.startsWith('/api/events/qr/') && method === 'GET') {
    const qrCode = path.split('/api/events/qr/')[1];
    const event = await env.DB.prepare('SELECT * FROM events WHERE qr_code = ?').bind(qrCode).first();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const voterId = url.searchParams.get('voter_id');
    if (voterId) {
      try {
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
        console.error('Error registering participant:', error);
      }
    }

    return new Response(JSON.stringify(event), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update event status
  if (path.startsWith('/api/events/') && path.endsWith('/status') && method === 'PUT') {
    try {
      const pathParts = path.split('/');
      const eventIdIndex = pathParts.indexOf('events') + 1;
      const eventId = pathParts[eventIdIndex];
      
      if (!eventId) {
        return new Response(JSON.stringify({ error: 'Event ID is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await request.json();
      if (!body.status) {
        return new Response(JSON.stringify({ error: 'Status is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await env.DB.prepare('UPDATE events SET status = ? WHERE id = ?')
        .bind(body.status, eventId).run();

      if (!result.success) {
        throw new Error('Database update failed');
      }

      return new Response(JSON.stringify({ success: true, eventId, status: body.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to update event status', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Get event by ID
  if (path.startsWith('/api/events/') && method === 'GET' && 
      !path.includes('/presentation') && !path.includes('/leaderboard') && !path.includes('/status')) {
    const pathWithoutQuery = path.split('?')[0];
    const eventId = pathWithoutQuery.split('/api/events/')[1];
    
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const images = await env.DB.prepare(
      'SELECT * FROM images WHERE event_id = ? ORDER BY uploaded_at ASC'
    ).bind(eventId).all();

    const voteStats = await env.DB.prepare(
      `SELECT image_id, AVG(stars) as avg_stars, COUNT(*) as vote_count 
       FROM votes WHERE event_id = ? GROUP BY image_id`
    ).bind(eventId).all();

    const participantCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
    ).bind(eventId).first();

    const currentImageIndex = event.current_image_index || 0;
    const currentImage = images.results && images.results[currentImageIndex] ? images.results[currentImageIndex] : null;

    let allVoted = false;
    let votesOnCurrentImage = 0;
    if (currentImage && participantCount?.count > 0) {
      const votesOnImage = await env.DB.prepare(
        `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ? AND image_id = ?`
      ).bind(eventId, currentImage.id).first();
      votesOnCurrentImage = votesOnImage?.count || 0;
      allVoted = votesOnCurrentImage >= participantCount.count;
    }
    
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
          const newCount = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
          ).bind(eventId).first();
          participantCount.count = newCount?.count || participantCount.count;
        }
      } catch (error) {
        console.error('Error registering participant:', error);
      }
    }

    return new Response(JSON.stringify({
      ...event,
      images: images.results || [],
      voteStats: voteStats.results || [],
      participantCount: participantCount?.count || 0,
      currentImageIndex: currentImageIndex,
      currentImage: currentImage,
      allVotedOnCurrent: allVoted,
      votesOnCurrentImage: votesOnCurrentImage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get presentation view
  if (path.startsWith('/api/events/') && path.endsWith('/presentation') && method === 'GET') {
    const eventId = path.split('/api/events/')[1].replace('/presentation', '');
    const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();

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
      `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
    ).bind(eventId).first();

    const currentImageIndex = event.current_image_index || 0;
    const currentImage = images.results && images.results[currentImageIndex] ? images.results[currentImageIndex] : null;

    let votesOnCurrentImage = 0;
    let allVoted = false;
    if (currentImage && participantCount?.count > 0) {
      const votesOnImage = await env.DB.prepare(
        `SELECT COUNT(DISTINCT voter_id) as count FROM votes WHERE event_id = ? AND image_id = ?`
      ).bind(eventId, currentImage.id).first();
      votesOnCurrentImage = votesOnImage?.count || 0;
      allVoted = votesOnCurrentImage >= participantCount.count;
    }

    return new Response(JSON.stringify({
      event: event,
      currentImage: currentImage,
      currentImageIndex: currentImageIndex,
      totalImages: images.results?.length || 0,
      participantCount: participantCount?.count || 0,
      votesOnCurrentImage: votesOnCurrentImage,
      allVoted: allVoted,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Advance to next image
  if (path.startsWith('/api/events/') && path.endsWith('/next-image') && method === 'POST') {
    const eventId = path.split('/api/events/')[1].replace('/next-image', '');
    const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();

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
      await env.DB.prepare('UPDATE events SET status = ? WHERE id = ?').bind('closed', eventId).run();
    } else {
      await env.DB.prepare('UPDATE events SET current_image_index = ? WHERE id = ?').bind(nextIndex, eventId).run();
    }

    return new Response(JSON.stringify({ success: true, nextIndex, isComplete: nextIndex >= totalImages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get leaderboard
  if (path.startsWith('/api/events/') && path.endsWith('/leaderboard') && method === 'GET') {
    const eventId = path.split('/api/events/')[1].replace('/leaderboard', '');

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

    const participantCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM participants WHERE event_id = ?`
    ).bind(eventId).first();

    return new Response(JSON.stringify({
      leaderboard: leaderboard.results || [],
      participantCount: participantCount?.count || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Upload image
  if (path === '/api/images' && method === 'POST') {
    try {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'Database not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const formData = await request.formData();
      const eventId = formData.get('eventId');
      const file = formData.get('file');

      if (!file || !eventId) {
        return new Response(JSON.stringify({ error: 'File and eventId are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({
          error: 'File too large',
          details: `Maximum file size is 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!file.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'File must be an image' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const imageId = crypto.randomUUID();
      const timestamp = Date.now();
      const filename = file.name;

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, chunk);
      }
      base64 = btoa(base64);

      if (base64.length > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({
          error: 'Image too large after encoding',
          details: 'Maximum safe size is ~3.75MB. The image will be automatically compressed on upload.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const dataUrl = `data:${file.type};base64,${base64}`;

      const result = await env.DB.prepare(
        'INSERT INTO images (id, event_id, url, filename, uploaded_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(imageId, eventId, dataUrl, filename, timestamp).run();

      if (!result.success) {
        throw new Error('Database insert failed');
      }

      return new Response(JSON.stringify({
        id: imageId,
        url: dataUrl,
        filename,
        event_id: eventId,
        size: file.size,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to upload image',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Submit vote
  if (path === '/api/votes' && method === 'POST') {
    try {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'Database not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await request.json();
      const { eventId, imageId, voterId, stars } = body;

      if (!eventId || !imageId || !voterId || !stars || stars < 1 || stars > 5) {
        return new Response(JSON.stringify({ error: 'Invalid vote data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const voteId = crypto.randomUUID();
      const timestamp = Date.now();

      const result = await env.DB.prepare(
        'INSERT INTO votes (id, event_id, image_id, voter_id, stars, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(voteId, eventId, imageId, voterId, stars, timestamp).run();

      if (!result.success) {
        throw new Error('Database insert failed');
      }

      return new Response(JSON.stringify({ success: true, id: voteId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to submit vote',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

