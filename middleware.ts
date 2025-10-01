// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export default withAuth(
    async function middleware(req) {
        const pathname = req.nextUrl.pathname

        const token = await getToken({ req })

        if (pathname.startsWith('/admin') && !token) {
            return NextResponse.redirect('/login')
        }
    },
    {
        callbacks: {
            async authorized() {
                return true
            },
        },
    }
)

export const config = {
  matcher: [

  ],
};