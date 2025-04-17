import { NextRequest, NextResponse } from 'next/server';
import { query } from '../utils/db';

export async function GET(request: NextRequest) {
  try {
    console.log(`Fetching posts from database`);
    const result = await query(`
      SELECT 
        p.id as id,
        p.content,
        p.created_at,
        p.author,
        u.name as author_name,
        u.email as author_email
      FROM posts p
      JOIN users u ON p.author = u.id
      ORDER BY p.created_at DESC
    `);
    
    if (!result.rows) {
      console.log('No posts found, returning empty array');
      const response = NextResponse.json([]);
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
      return response;
    }
    
    console.log(`Found ${result.rows.length} posts`);
    const response = NextResponse.json(result.rows);
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    const response = NextResponse.json(
      { 
        error: 'Database query failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { value, userId } = await request.json();
    
    // Validate required fields
    if (!value || !userId) {
      const response = NextResponse.json(
        { error: 'Missing required fields: content or userId' },
        { status: 400 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
      return response;
    }

    console.log(`Creating new post for user ${userId}`);
    
    // Verify user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
      return response;
    }
    
    const result = await query(
      `INSERT INTO posts (content, created_at, author) 
       VALUES ($1, NOW(), $2) 
       RETURNING id as id, content, created_at, author`,
      [value, userId]
    );
    
    if (!result.rows[0]?.id) {
      throw new Error('Post creation failed - no ID returned');
    }
    
    console.log('Created new post with ID:', result.rows[0].id);
    const response = NextResponse.json(result.rows[0]);
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    const response = NextResponse.json(
      { 
        error: 'Failed to create post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { postId, userId } = await request.json();

    // Validate required fields
    if (!postId || !userId) {
      const response = NextResponse.json(
        { error: 'Missing required fields: postId or userId' },
        { status: 400 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
      return response;
    }

    console.log(`Attempting to delete post ${postId} for user ${userId}`);

    // Verify the post belongs to the user
    const postCheck = await query(
      'SELECT id FROM posts WHERE id = $1 AND author = $2',
      [postId, userId]
    );
    if (postCheck.rows.length === 0) {
      const response = NextResponse.json(
        { error: 'Post not found or does not belong to the user' },
        { status: 404 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
      return response;
    }

    // Delete the post
    await query('DELETE FROM posts WHERE id = $1', [postId]);

    console.log(`Deleted post ${postId}`);
    const response = NextResponse.json({ success: true });
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  } catch (error) {
    console.error('Error deleting post:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    const response = NextResponse.json(
      { error: 'Failed to delete post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching
    return response;
  }
}
