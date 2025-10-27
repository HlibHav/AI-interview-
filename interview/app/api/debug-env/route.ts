import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    WEAVIATE_HOST: process.env.WEAVIATE_HOST,
    WEAVIATE_API_KEY: process.env.WEAVIATE_API_KEY ? 'SET' : 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('WEAVIATE'))
  });
}
