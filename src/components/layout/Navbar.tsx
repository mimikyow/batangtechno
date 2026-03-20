
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShieldCheck, Telescope, Menu, LogOut, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { getPlaceholderImage } from "@/lib/placeholder-images";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();

  const logo = getPlaceholderImage("header-logo");

  // Get Admin Email from env
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const judgeDocRef = useMemoFirebase(() => user ? doc(db, "roles_judge", user.uid) : null, [db, user]);
  const { data: judgeRole } = useDoc(judgeDocRef);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isJudge = !!judgeRole;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { name: "Public Board", href: "/", icon: Telescope, show: true },
    { name: "Judge Panel", href: "/judge", icon: ShieldCheck, show: isJudge },
    { name: "Command Center", href: "/admin", icon: Rocket, show: isAdmin },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 flex items-center justify-center transition-all group-hover:scale-110">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt={logo.description} 
                width={40} 
                height={40} 
                className="object-contain"
              />
            )}
          </div>
          <span className="font-bold text-xl tracking-tight glow-accent text-white">
            CICS – SC Alangilan
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md transition-all hover:bg-white/5",
                  isActive ? "text-accent border-b-2 border-accent rounded-none" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-border">
              <div className="flex flex-col gap-4 mt-8">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-lg text-lg",
                      pathname === item.href ? "bg-accent/10 text-accent" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
                {user && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
                      <LogOut className="w-5 h-5 mr-4" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
