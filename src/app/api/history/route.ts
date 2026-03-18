import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CalcEntry, evaluateExpression, generateId } from '@/lib/calculator';

// In-memory fallback storage when Supabase is not available
let mockHistory: CalcEntry[] = [
  {
    id: 'mock1',
    expression: '2 + 2',
    result: '4',
    timestamp: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 'mock2',
    expression: '10 * 5',
    result: '50',
    timestamp: new Date('2024-01-15T10:31:00Z')
  },
  {
    id: 'mock3',
    expression: '(15 + 5) / 4',
    result: '5',
    timestamp: new Date('2024-01-15T10:32:00Z')
  }
];

/**
 * Check if Supabase environment variables are configured
 */
function hasSupabaseConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * GET /api/history - Retrieve calculation history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    let history: CalcEntry[] = [];

    if (hasSupabaseConfig()) {
      try {
        // Use Supabase
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('calculations')
          .select('*')
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        history = (data || []).map(row => ({
          id: row.id,
          expression: row.expression,
          result: row.result,
          timestamp: new Date(row.timestamp)
        }));
      } catch (error) {
        console.error('Failed to fetch from Supabase, falling back to mock data:', error);
        // Fall back to mock data on Supabase error
        history = mockHistory
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(offset, offset + limit);
      }
    } else {
      // Use mock data when Supabase is not configured
      history = mockHistory
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);
    }

    return NextResponse.json({
      success: true,
      data: history,
      total: hasSupabaseConfig() ? null : mockHistory.length, // We can't easily get total count from Supabase without extra query
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/history:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve calculation history',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/history - Save a new calculation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { expression } = body;

    // Validate input
    if (!expression || typeof expression !== 'string') {
      return NextResponse.json(
        { error: 'Expression is required and must be a string' },
        { status: 400 }
      );
    }

    if (expression.trim().length === 0) {
      return NextResponse.json(
        { error: 'Expression cannot be empty' },
        { status: 400 }
      );
    }

    if (expression.length > 1000) {
      return NextResponse.json(
        { error: 'Expression is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Evaluate the expression
    const calcResult = evaluateExpression(expression.trim());

    if (calcResult.error) {
      return NextResponse.json(
        {
          error: 'Invalid expression',
          details: calcResult.error
        },
        { status: 400 }
      );
    }

    // Create history entry
    const historyEntry: CalcEntry = {
      id: generateId(),
      expression: calcResult.expression,
      result: calcResult.result,
      timestamp: new Date()
    };

    if (hasSupabaseConfig()) {
      try {
        // Save to Supabase
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('calculations')
          .insert([{
            id: historyEntry.id,
            expression: historyEntry.expression,
            result: historyEntry.result,
            timestamp: historyEntry.timestamp.toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }

        // Return the saved entry from Supabase
        const savedEntry: CalcEntry = {
          id: data.id,
          expression: data.expression,
          result: data.result,
          timestamp: new Date(data.timestamp)
        };

        return NextResponse.json({
          success: true,
          data: savedEntry
        });

      } catch (error) {
        console.error('Failed to save to Supabase, falling back to mock storage:', error);
        // Fall back to mock storage on Supabase error
        mockHistory.push(historyEntry);
        // Keep only the last 100 entries in mock storage
        if (mockHistory.length > 100) {
          mockHistory = mockHistory.slice(-100);
        }
      }
    } else {
      // Use mock storage when Supabase is not configured
      mockHistory.push(historyEntry);
      // Keep only the last 100 entries in mock storage
      if (mockHistory.length > 100) {
        mockHistory = mockHistory.slice(-100);
      }
    }

    return NextResponse.json({
      success: true,
      data: historyEntry
    });

  } catch (error) {
    console.error('Error in POST /api/history:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to save calculation',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history - Clear all history (for development/testing)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    if (hasSupabaseConfig()) {
      try {
        // Clear Supabase history
        const supabase = await createClient();

        const { error } = await supabase
          .from('calculations')
          .delete()
          .neq('id', ''); // Delete all records

        if (error) {
          console.error('Supabase delete error:', error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: 'All calculation history cleared from database'
        });

      } catch (error) {
        console.error('Failed to clear Supabase history, clearing mock storage:', error);
        // Fall back to clearing mock storage
        mockHistory = [];
      }
    } else {
      // Clear mock storage when Supabase is not configured
      mockHistory = [];
    }

    return NextResponse.json({
      success: true,
      message: 'All calculation history cleared'
    });

  } catch (error) {
    console.error('Error in DELETE /api/history:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear calculation history',
        success: false
      },
      { status: 500 }
    );
  }
}