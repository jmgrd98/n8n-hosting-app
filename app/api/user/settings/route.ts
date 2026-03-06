import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/database';

const DEFAULT_PREFERENCES = {
  theme: 'system',
  language: 'pt-BR',
  emailNotifications: true,
  marketingEmails: false,
  defaultInstanceSize: null,
  defaultRegion: null,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferences: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      preferences: user.preferences || DEFAULT_PREFERENCES,
      connectedAccounts: user.accounts.map((a) => ({
        provider: a.provider,
      })),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { theme, language, emailNotifications, marketingEmails, defaultInstanceSize, defaultRegion } = body;

    const preferences = {
      theme: theme || 'system',
      language: language || 'pt-BR',
      emailNotifications: emailNotifications ?? true,
      marketingEmails: marketingEmails ?? false,
      defaultInstanceSize: defaultInstanceSize || null,
      defaultRegion: defaultRegion || null,
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
