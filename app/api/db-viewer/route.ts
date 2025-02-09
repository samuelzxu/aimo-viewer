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
        
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '30');
        const offset = (page - 1) * pageSize;
        const runName = searchParams.get('runName');
        
        let whereClause = '';
        const whereConditions = [];
        const params: string[] = [];
        
        if (runName) {
          whereConditions.push(`run_name = $${params.length + 1}`);
          params.push(runName);
        }
        
        if (whereConditions.length > 0) {
          whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        }
        
        // Get total count first
        const countResult = await sql.query(
          `SELECT COUNT(*) as total FROM "${tableName}" ${whereClause}`,
          params
        );
        const totalCount = parseInt(countResult.rows[0].total);
        
        // Then get paginated data
        const data = await sql.query(
          `SELECT * FROM "${tableName}" 
           ${whereClause}
           ORDER BY exec_time DESC 
           LIMIT ${pageSize} 
           OFFSET ${offset}`,
          params
        );
        
        return NextResponse.json({
          rows: data.rows,
          totalCount,
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
  }
}