import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getInstanceById, deleteInstance } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Verify instance exists and belongs to user
    const instance = await getInstanceById(id);
    
    if (!instance || instance.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }
    
    // Delete the instance
    await deleteInstance(id);
    
    // TODO: Here you would trigger the actual AWS infrastructure deletion
    // For now, we're just marking it as deleted in the database
    
    return NextResponse.json({ 
      success: true,
      message: 'Instance deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete instance:', error);
    return NextResponse.json(
      { error: 'Failed to delete instance' },
      { status: 500 }
    );
  }
}