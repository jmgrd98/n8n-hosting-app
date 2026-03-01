import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';
import OpenAI from 'openai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: instanceId } = await params;
    const body = await request.json();
    const { prompt, apiKeyId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // FIXED: Removed deletedAt check
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId: session.user.id,
      },
    });

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Verify API key belongs to this instance
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        instanceId: instanceId,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Generate workflow using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert n8n workflow automation specialist. Generate valid n8n workflow JSON based on user descriptions.

Rules:
- Return ONLY valid JSON, no markdown or explanations
- Use realistic n8n node types (HTTP Request, Schedule Trigger, Email, Slack, etc.)
- Include proper node connections
- Set reasonable parameters for each node
- Make workflows practical and functional
- Include a descriptive name and description

Return format:
{
  "name": "Workflow Name",
  "description": "What this workflow does",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const workflow = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
    console.error('Error generating workflow:', error);
    if (error.name === 'SyntaxError') {
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow' },
      { status: 500 }
    );
  }
    

  
    

  }
}