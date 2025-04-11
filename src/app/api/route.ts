import { NextRequest, NextResponse } from 'next/server';
import { query } from '../utils/db';

export async function GET() {
  try {
    console.log('Fetching posts from database');
    const result = await query(`
      SELECT 
        p.id as id,
        p.content,
        p.created_at,
        p.author,
        u.name as author_name,
        u.email as author_email
      FROM posts p
      JOIN users u ON p.author = u.user_id
      ORDER BY p.created_at DESC
    `);
    
    if (!result.rows) {
      console.log('No posts found, returning empty array');
      return NextResponse.json([]);
    }
    
    console.log(`Found ${result.rows.length} posts`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database query failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { value, userId } = await request.json();
    
    // Validate required fields
    if (!value || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: content or userId' },
        { status: 400 }
      );
    }

    console.log(`Creating new post for user ${userId}`);
    
    // Verify user exists
    const userCheck = await query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
