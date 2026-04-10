"use client";

import { auth } from "@/server/better-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/avatar";
import { Button } from "@ui/button";
import Link from "next/link";
import { authClient } from "@/server/better-auth/client";
import { useReducer } from "react";
import { useRouter } from "next/navigation";
export function UserIcon({
  user,
}: {
  user: typeof auth.$Infer.Session.user | undefined;
}) {
  const router = useRouter();

  if (user === undefined) {
    return (
      <Link href="/auth/sign-in">
        <Button size="sm">Sign In</Button>
      </Link>
    );
  }

  const nameChar = user.name[0]?.toLocaleUpperCase() ?? "U";
  const userImg = user.image;
  const auth = authClient;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar>
            <AvatarImage src={userImg !== null ? userImg : undefined} />
            <AvatarFallback>{nameChar}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              router.push("/account");
            }}
          >
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await auth.signOut();
              router.push("/");
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>{" "}
    </DropdownMenu>
  );
}
