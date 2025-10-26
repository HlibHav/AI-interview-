import { NextRequest, NextResponse } from 'next/server';
import weaviate from 'weaviate-ts-client';

// Initialize Weaviate client
let client: any;
try {
  const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
  const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');
  
  console.log('🔗 [WEAVIATE] Initializing client:', {
    host: weaviateHost,
    isCloud,
    hasApiKey: !!process.env.WEAVIATE_API_KEY
  });

  client = weaviate.client({
    scheme: isCloud ? 'https' : 'http',
    host: weaviateHost,
    apiKey: process.env.WEAVIATE_API_KEY as any,
  });
} catch (error) {
  console.error('Failed to initialize Weaviate client:', error);
}

// Interview Session Schema
const InterviewSessionSchema = {
  class: 'InterviewSession',
  description: 'Complete interview session with all settings and data',
  properties: [
    { name: 'sessionId', dataType: ['text'] },
    { name: 'sessionUrl', dataType: ['text'] }, // Direct link to access session
    { name: 'researchGoal', dataType: ['text'] },
    { name: 'targetAudience', dataType: ['text'] },
    { name: 'duration', dataType: ['int'] },
    { name: 'sensitivity', dataType: ['text'] },
    { name: 'participantEmail', dataType: ['text'] },
    { name: 'participantName', dataType: ['text'] },
    { name: 'roomName', dataType: ['text'] },
    { name: 'livekitToken', dataType: ['text'] },
    { name: 'beyondPresenceAgentId', dataType: ['text'] },
    { name: 'beyondPresenceSessionId', dataType: ['text'] },
    { name: 'status', dataType: ['text'] }, // created, in_progress, completed, cancelled
    { name: 'startTime', dataType: ['date'] },
    { name: 'endTime', dataType: ['date'] },
    { name: 'durationMinutes', dataType: ['number'] },
    { name: 'script', dataType: ['text'] }, // JSON string of interview script
    { name: 'transcript', dataType: ['text'] }, // JSON string of transcript entries
    { name: 'insights', dataType: ['text'] }, // JSON string of session insights
    { name: 'psychometricProfile', dataType: ['text'] }, // JSON string of psych profile
    { name: 'keyFindings', dataType: ['text[]'] },
    { name: 'summary', dataType: ['text'] },
    { name: 'createdAt', dataType: ['date'] },
    { name: 'updatedAt', dataType: ['date'] },
    { name: 'createdBy', dataType: ['text'] }, // Admin user who created the session
    { name: 'tags', dataType: ['text[]'] }, // Custom tags for organization
    { name: 'isPublic', dataType: ['boolean'] }, // Whether session can be accessed via public link
    { name: 'accessCode', dataType: ['text'] }, // Optional access code for private sessions
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'create_schema':
        await createSessionSchema();
        return NextResponse.json({ success: true, message: 'Interview session schema created successfully' });

      case 'create_session':
        const sessionResult = await createSession(data);
        return NextResponse.json({ success: true, session: sessionResult });

      case 'get_session':
        const session = await getSession(data.sessionId);
        return NextResponse.json({ success: true, session });

      case 'update_session':
        const updateResult = await updateSession(data.sessionId, data.updates);
        return NextResponse.json({ success: true, session: updateResult });

      case 'list_sessions':
        const sessions = await listSessions(data.filters || {});
        return NextResponse.json({ success: true, sessions });

      case 'delete_session':
        await deleteSession(data.sessionId);
        return NextResponse.json({ success: true, message: 'Session deleted successfully' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Weaviate session operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform session operation' },
      { status: 500 }
    );
  }
}

async function createSessionSchema() {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    // Check if schema already exists
    const existingSchema = await client.schema.getter().do();
    const schemaExists = existingSchema.classes?.some((cls: any) => cls.class === 'InterviewSession');

    if (!schemaExists) {
      await client.schema.classCreator().withClass(InterviewSessionSchema).do();
      console.log('Interview session schema created successfully');
    } else {
      console.log('Interview session schema already exists');
    }
  } catch (error) {
    console.error('Error creating session schema:', error);
    throw error;
  }
}

async function createSession(sessionData: any) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    const sessionId = sessionData.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sessionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/respondent?session=${sessionId}`;
    
    const sessionObject = {
      sessionId,
      sessionUrl,
      researchGoal: sessionData.researchGoal || '',
      targetAudience: sessionData.targetAudience || '',
      duration: sessionData.duration || 30,
      sensitivity: sessionData.sensitivity || 'low',
      participantEmail: sessionData.participantEmail || '',
      participantName: sessionData.participantName || '',
      roomName: sessionData.roomName || `interview-${sessionId}`,
      livekitToken: sessionData.livekitToken || '',
      beyondPresenceAgentId: sessionData.beyondPresenceAgentId || '',
      beyondPresenceSessionId: sessionData.beyondPresenceSessionId || '',
      status: sessionData.status || 'created',
      startTime: sessionData.startTime || null,
      endTime: sessionData.endTime || null,
      durationMinutes: sessionData.durationMinutes || 0,
      script: sessionData.script ? JSON.stringify(sessionData.script) : '',
      transcript: sessionData.transcript ? JSON.stringify(sessionData.transcript) : '',
      insights: sessionData.insights ? JSON.stringify(sessionData.insights) : '',
      psychometricProfile: sessionData.psychometricProfile ? JSON.stringify(sessionData.psychometricProfile) : '',
      keyFindings: sessionData.keyFindings || [],
      summary: sessionData.summary || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: sessionData.createdBy || 'system',
      tags: sessionData.tags || [],
      isPublic: sessionData.isPublic || false,
      accessCode: sessionData.accessCode || '',
    };

    const result = await client.data
      .creator()
      .withClassName('InterviewSession')
      .withProperties(sessionObject)
      .do();

    return {
      id: result.id,
      ...sessionObject
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

async function getSession(sessionId: string) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    const result = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields('sessionId sessionUrl researchGoal targetAudience duration sensitivity participantEmail participantName roomName livekitToken beyondPresenceAgentId beyondPresenceSessionId status startTime endTime durationMinutes script transcript insights psychometricProfile keyFindings summary createdAt updatedAt createdBy tags isPublic accessCode')
      .withWhere({
        path: ['sessionId'],
        operator: 'Equal',
        valueText: sessionId
      })
      .do();

    if (result.data?.Get?.InterviewSession?.length > 0) {
      const session = result.data.Get.InterviewSession[0];
      
      // Parse JSON fields
      if (session.script) {
        try {
          session.script = JSON.parse(session.script);
        } catch (e) {
          console.warn('Failed to parse script JSON:', e);
        }
      }
      
      if (session.transcript) {
        try {
          session.transcript = JSON.parse(session.transcript);
        } catch (e) {
          console.warn('Failed to parse transcript JSON:', e);
        }
      }
      
      if (session.insights) {
        try {
          session.insights = JSON.parse(session.insights);
        } catch (e) {
          console.warn('Failed to parse insights JSON:', e);
        }
      }
      
      if (session.psychometricProfile) {
        try {
          session.psychometricProfile = JSON.parse(session.psychometricProfile);
        } catch (e) {
          console.warn('Failed to parse psychometric profile JSON:', e);
        }
      }

      return session;
    }

    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
}

async function updateSession(sessionId: string, updates: any) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    // First get the session to find its Weaviate ID
    const session = await getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Convert JSON objects to strings for storage
    if (updateData.script && typeof updateData.script === 'object') {
      updateData.script = JSON.stringify(updateData.script);
    }
    if (updateData.transcript && typeof updateData.transcript === 'object') {
      updateData.transcript = JSON.stringify(updateData.transcript);
    }
    if (updateData.insights && typeof updateData.insights === 'object') {
      updateData.insights = JSON.stringify(updateData.insights);
    }
    if (updateData.psychometricProfile && typeof updateData.psychometricProfile === 'object') {
      updateData.psychometricProfile = JSON.stringify(updateData.psychometricProfile);
    }

    // Update the session
    const result = await client.data
      .updater()
      .withClassName('InterviewSession')
      .withId(session.id)
      .withProperties(updateData)
      .do();

    return await getSession(sessionId);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

async function listSessions(filters: any = {}) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    let whereClause: any = {};
    
    // Build where clause based on filters
    if (filters.status) {
      whereClause = {
        path: ['status'],
        operator: 'Equal',
        valueText: filters.status
      };
    }
    
    if (filters.createdBy) {
      whereClause = {
        path: ['createdBy'],
        operator: 'Equal',
        valueText: filters.createdBy
      };
    }

    const result = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields('sessionId sessionUrl researchGoal targetAudience duration sensitivity participantEmail participantName roomName livekitToken beyondPresenceAgentId beyondPresenceSessionId status startTime endTime durationMinutes script transcript insights psychometricProfile keyFindings summary createdAt updatedAt createdBy tags isPublic accessCode')
      .withWhere(whereClause)
      .withLimit(filters.limit || 50)
      .do();

    const sessions = result.data?.Get?.InterviewSession || [];
    
    // Parse JSON fields for each session
    return sessions.map((session: any) => {
      if (session.script) {
        try {
          session.script = JSON.parse(session.script);
        } catch (e) {
          console.warn('Failed to parse script JSON:', e);
        }
      }
      
      if (session.transcript) {
        try {
          session.transcript = JSON.parse(session.transcript);
        } catch (e) {
          console.warn('Failed to parse transcript JSON:', e);
        }
      }
      
      if (session.insights) {
        try {
          session.insights = JSON.parse(session.insights);
        } catch (e) {
          console.warn('Failed to parse insights JSON:', e);
        }
      }
      
      if (session.psychometricProfile) {
        try {
          session.psychometricProfile = JSON.parse(session.psychometricProfile);
        } catch (e) {
          console.warn('Failed to parse psychometric profile JSON:', e);
        }
      }

      return session;
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    throw error;
  }
}

async function deleteSession(sessionId: string) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }

    // First get the session to find its Weaviate ID
    const session = await getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await client.data
      .deleter()
      .withClassName('InterviewSession')
      .withId(session.id)
      .do();

    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}
