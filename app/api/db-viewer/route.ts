import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Validate table name to prevent SQL injection
function isValidTableName(name: string): boolean {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z0-9_]+$/.test(name);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const tableName = searchParams.get('table');

  try {
    switch (action) {
      case 'getTables':
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        return NextResponse.json(tables.rows);

      case 'getSchema':
        if (!tableName) {
          return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
        }
        if (!isValidTableName(tableName)) {
          return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
        }
        const schema = await sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
        `;
        return NextResponse.json(schema.rows);

      case 'getData':
        if (!tableName) {
          return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
        }
        if (!isValidTableName(tableName)) {
          return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
        }
        
        // Use identifier function to safely quote the table name
        const data = await sql.query(
          `SELECT * FROM "${tableName}" LIMIT 100`
        );
        return NextResponse.json(data.rows);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
  }
}