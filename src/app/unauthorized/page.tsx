import Link from "next/link";
import { getSession } from "@/lib/session";
import { StandalonePage } from "@/components/common/PagePrimitives";

export default async function Unauthorized() {
  const session = await getSession();
  const description = session
    ? `Your role (${session.role}) does not have access to this area.`
    : "You need to sign in to continue.";

  return (
    <StandalonePage title="Access denied" description={description}>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/login" className="btn-primary text-center">
          Sign in
        </Link>
        {session && (
          <Link href="/dashboard" className="btn-secondary text-center">
            Go to dashboard
          </Link>
        )}
      </div>
    </StandalonePage>
  );
}
