import { LogOut } from "lucide-react";
import { logout } from "./actions";

export function LogoutButton() {
  return <form action={logout}><button className="btn btn-ghost" data-tip="Log out" data-tip-pos="bottom"><LogOut aria-hidden /><span className="sr-only">Log out</span></button></form>;
}
