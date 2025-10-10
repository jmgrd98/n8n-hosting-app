import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';

// DELETE - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: instanceId, keyId } = await params;

    // Get the API key and verify ownership through the instance
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      include: {
        instance: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Verify the API key belongs to the correct instance and user
    if (apiKey.instanceId !== instanceId || apiKey.instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

// PUT - Update an API key (optional - for updating name or last used timestamp)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: instanceId, keyId } = await params;
    const body = await request.json();
    const { name } = body;

    // Get the API key and verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      include: {
        instance: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    if (apiKey.instanceId !== instanceId || apiKey.instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update the API key
    const updatedKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        ...(name && { name }),
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: updatedKey,
    });
  } catch (error) {
    console.error('Failed to update API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}