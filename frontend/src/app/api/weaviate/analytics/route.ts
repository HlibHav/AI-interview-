import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    if (type === 'overview') {
      // Get overview analytics
        const query = {
          query: `
            {
              Get {
                InterviewSession(limit: 1000) {
                  _additional {
                    id
                  }
                  status
                  productArea
                  userRole
                }
              }
            }
          `
        };

      const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${weaviateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Weaviate request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      const sessions = result.data?.Get?.InterviewSession || [];
      
      // Calculate analytics
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;

      // Group by product area
      const byProductArea = sessions.reduce((acc, session) => {
        const area = session.productArea || 'Unknown';
        acc[area] = (acc[area] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by user role
      const byUserRole = sessions.reduce((acc, session) => {
        const role = session.userRole || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        success: true,
        analytics: {
          totalSessions,
          completedSessions,
          completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
          byProductArea,
          byUserRole,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown analytics type',
    }, { status: 400 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
