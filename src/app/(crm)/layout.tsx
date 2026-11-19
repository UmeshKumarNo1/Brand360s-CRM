import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { ToastProvider } from "@/components/common/ToastProvider";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  let profile = null;
  try {
    profile = await getCurrentUserProfileAction();
  } catch (err) {
    console.error("Layout error getting profile:", err);
  }

  return (
    <ToastProvider>
      <AppLayout 
        userProfile={profile ? {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
        } : undefined}
      >
        {children}
      </AppLayout>
    </ToastProvider>
  );
}
