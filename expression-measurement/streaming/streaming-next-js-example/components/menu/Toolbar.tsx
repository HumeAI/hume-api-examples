import { AuthContext } from "./Auth";
import { Button } from "../inputs/Button";
import { useContext } from "react";

export function Toolbar() {
  const authContext = useContext(AuthContext);

  return (
    <div className="fixed bottom-0 z-10 flex h-16 w-full bg-neutral-100">
      <div className="w-full border-t-2 border-neutral-200"></div>

      <div className="pb-3 pt-4">
        <Button
          className="absolute right-8 w-24 text-center text-sm"
          text="Log out"
          onClick={authContext.unauthenticate}
          tooltip="Log out"
        />
      </div>
    </div>
  );
}
