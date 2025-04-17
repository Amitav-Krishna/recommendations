import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../utils/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      id: user.id, // Ensure this matches the frontend expectation
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error); // Log the error for debugging
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
