import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { ToastProvider } from "@/components/common/ToastProvider";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfileAction();

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
